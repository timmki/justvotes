import '@testing-library/jest-dom/vitest';
import {QueryClientProvider} from '@tanstack/react-query';
import {cleanup, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {apiClient, sessionCoordinator} from '../../shared/api/client';
import {networkError, problemError} from '../../shared/api/errors';
import {queryClient} from '../../shared/api/queryClient';
import {queryKeys} from '../../shared/api/queryKeys';
import {I18nProvider} from '../../shared/i18n/I18nProvider';
import {AdminPage} from './AdminPage';
import type {components} from '../../shared/api/generated/justvotes';

beforeEach(() => {
    queryClient.clear();
    const values = new Map<string, string>();
    Object.defineProperty(window, 'localStorage', {
        configurable: true,
        value: {
            clear: () => values.clear(),
            getItem: (key: string) => values.get(key) ?? null,
            setItem: (key: string, value: string) => values.set(key, value),
        },
    });
});

afterEach(() => {
    cleanup();
    queryClient.clear();
    if (sessionCoordinator.isLoginRequired()) sessionCoordinator.consumeReturnRoute();
    vi.restoreAllMocks();
});

function renderAdmin(initialEntry = '/admin') {
    return render(
        <MemoryRouter initialEntries={[initialEntry]}>
            <QueryClientProvider client={queryClient}>
                <I18nProvider>
                    <AdminPage/>
                </I18nProvider>
            </QueryClientProvider>
        </MemoryRouter>,
    );
}

describe('AdminPage session gate', () => {
    it('shows only a loading state while the session is being checked', () => {
        vi.spyOn(apiClient, 'getAdminSession').mockImplementation(() => new Promise(() => undefined));

        renderAdmin();

        expect(screen.getByRole('status')).toHaveTextContent('Wird geladen');
        expect(screen.queryByRole('tab')).toBeNull();
        expect(screen.queryByLabelText('Benutzername')).toBeNull();
    });

    it('shows five active subroute tabs and loads only the visible area', async () => {
        const getAdminSession = vi.spyOn(apiClient, 'getAdminSession').mockResolvedValue(undefined);
        const getAdminVotes = vi.spyOn(apiClient, 'getAdminVotes').mockResolvedValue({
            votes: [],
            page: 0,
            size: 50,
            totalElements: 0
        });
        const getAdminPolls = vi.spyOn(apiClient, 'getAdminPolls').mockResolvedValue([]);
        const getGroups = vi.spyOn(apiClient, 'getGroups').mockResolvedValue([]);
        const getTemplates = vi.spyOn(apiClient, 'getTemplates').mockResolvedValue([]);

        renderAdmin('/admin/votes');

        expect(await screen.findByRole('heading', {name: 'Stimmen', level: 3})).toBeVisible();
        expect(screen.getAllByRole('link')).toHaveLength(5);
        expect(screen.getByRole('link', {name: 'Stimmen'})).toHaveAttribute('aria-current', 'page');
        expect(getAdminSession).toHaveBeenCalledTimes(1);
        expect(getAdminVotes).toHaveBeenCalledTimes(1);
        expect(getAdminPolls).not.toHaveBeenCalled();
        expect(getGroups).not.toHaveBeenCalled();
        expect(getTemplates).not.toHaveBeenCalled();
    });

    it.each([
        ['bad request', problemError({
            status: 400,
            code: 'invalid_credentials'
        }, 400), 'Die Anfrage konnte nicht verarbeitet werden.'],
        ['bad credentials', problemError({status: 401, code: 'unauthorized'}, 401), 'Die Anmeldung ist abgelaufen.'],
        ['csrf failure', problemError({status: 403, code: 'csrf_invalid'}, 403), 'Diese Aktion ist nicht erlaubt.'],
        ['network failure', networkError(new Error('offline')), 'Netzwerkfehler. Prüfe deine Verbindung.'],
    ])('keeps credentials transient after %s', async (_description, error, message) => {
        vi.spyOn(apiClient, 'getAdminSession').mockRejectedValue(problemError({
            status: 401,
            code: 'unauthorized'
        }, 401));
        vi.spyOn(apiClient, 'login').mockRejectedValue(error);

        renderAdmin();

        const username = await screen.findByLabelText('Benutzername');
        fireEvent.change(username, {target: {value: 'admin'}});
        fireEvent.change(screen.getByLabelText('Passwort'), {target: {value: 'secret'}});
        fireEvent.click(screen.getByRole('button', {name: 'Anmelden'}));

        expect(await screen.findByRole('alert')).toHaveTextContent(message);
        expect(window.localStorage.getItem('password')).toBeNull();
    });

    it('restores the route that triggered login and loads that area after login', async () => {
        vi.spyOn(apiClient, 'getAdminSession').mockResolvedValue(undefined);
        vi.spyOn(apiClient, 'login').mockResolvedValue(undefined);
        vi.spyOn(apiClient, 'getAdminPolls').mockResolvedValue([]);
        if (sessionCoordinator.isLoginRequired()) sessionCoordinator.consumeReturnRoute();
        sessionCoordinator.requireLogin('/admin/polls');

        renderAdmin();

        fireEvent.change(await screen.findByLabelText('Benutzername'), {target: {value: 'admin'}});
        fireEvent.change(screen.getByLabelText('Passwort'), {target: {value: 'secret'}});
        fireEvent.click(screen.getByRole('button', {name: 'Anmelden'}));

        expect(await screen.findByRole('heading', {name: 'Polls', level: 3})).toBeVisible();
        expect(screen.getByRole('link', {name: 'Polls'})).toHaveAttribute('aria-current', 'page');
    });

    it('removes protected content and shows login when the visible area expires', async () => {
        const unauthorized = problemError({status: 401, code: 'unauthorized'}, 401);
        vi.spyOn(apiClient, 'getAdminSession').mockResolvedValue(undefined);
        vi.spyOn(apiClient, 'getAdminVotes').mockImplementation(async () => {
            sessionCoordinator.requireLogin('/admin/votes');
            throw unauthorized;
        });

        renderAdmin('/admin/votes');

        expect(await screen.findByLabelText('Benutzername')).toBeVisible();
        expect(screen.queryByRole('tab')).toBeNull();
        expect(screen.queryByRole('heading', {name: 'Stimmen', level: 3})).toBeNull();
    });

    it('logs out and removes the protected query cache before returning to login', async () => {
        vi.spyOn(apiClient, 'getAdminSession').mockResolvedValue(undefined);
        vi.spyOn(apiClient, 'getAdminVotes').mockResolvedValue({votes: [], page: 0, size: 50, totalElements: 0});
        vi.spyOn(apiClient, 'logout').mockImplementation(async () => {
            queryClient.removeQueries({queryKey: queryKeys.adminSession});
            sessionCoordinator.requireLogin('/admin');
        });
        queryClient.setQueryData(queryKeys.adminPolls, [{id: 'private-poll'}]);

        renderAdmin('/admin/votes');

        await screen.findByRole('heading', {name: 'Stimmen', level: 3});
        fireEvent.click(screen.getByRole('button', {name: 'Abmelden'}));

        expect(await screen.findByLabelText('Benutzername')).toBeVisible();
        expect(queryClient.getQueryData(queryKeys.adminPolls)).toBeUndefined();
        await waitFor(() => expect(screen.queryByRole('link', {name: 'Stimmen'})).toBeNull());
    });

    it('searches templates and paginates in pages of twenty', async () => {
        vi.spyOn(apiClient, 'getAdminSession').mockResolvedValue(undefined);
        vi.spyOn(apiClient, 'getTemplates').mockResolvedValue(Array.from({length: 21}, (_, index) => ({
            id: `t_v1_${index + 1}`,
            name: `Template ${index + 1}`
        })));

        renderAdmin('/admin/templates');

        expect(await screen.findByRole('heading', {name: 'Optionsvorlagen', level: 3})).toBeVisible();
        expect(screen.getAllByRole('listitem')).toHaveLength(20);
        fireEvent.click(screen.getByRole('button', {name: 'Weiter'}));
        expect(screen.getByText('Template 21')).toBeVisible();
        expect(screen.getAllByRole('listitem')).toHaveLength(1);
        fireEvent.change(screen.getByLabelText('Vorlagen suchen'), {target: {value: 'Template 2'}});
        expect(screen.getByText('Template 2')).toBeVisible();
        expect(screen.getByText('Template 20')).toBeVisible();
    });

    it('trims batch values and reports partial failures', async () => {
        vi.spyOn(apiClient, 'getAdminSession').mockResolvedValue(undefined);
        vi.spyOn(apiClient, 'getTemplates').mockResolvedValue([{id: 't_v1_existing', name: 'alpha'}]);
        const createTemplate = vi.spyOn(apiClient, 'createTemplate').mockImplementation(async (name) => {
            if (name === 'beta') throw problemError({status: 409, code: 'conflict'}, 409);
            return {id: 't_v1_gamma', name};
        });

        renderAdmin('/admin/templates');

        await screen.findByRole('heading', {name: 'Optionsvorlagen', level: 3});
        fireEvent.change(screen.getByLabelText('Mehrere Vorlagen (kommagetrennt)'), {target: {value: ' Alpha, , Beta, beta, Gamma '}});
        fireEvent.click(screen.getByRole('button', {name: 'Importieren'}));

        expect(await screen.findByText('Import-Ergebnis')).toBeVisible();
        expect(createTemplate.mock.calls.map(([name]) => name).sort()).toEqual(['Alpha', 'Beta', 'Gamma', 'beta']);
        expect(screen.getByRole('status')).toHaveTextContent('Erstellt: 3');
        expect(screen.getByRole('status')).toHaveTextContent('Alpha');
        expect(screen.getByRole('status')).toHaveTextContent('Beta');
        expect(screen.getByRole('status')).toHaveTextContent('Gamma');
        expect(screen.getByRole('status')).toHaveTextContent('Übersprungen: 1');
        expect(screen.getByRole('status')).toHaveTextContent('Leerer Wert');
        expect(screen.getByRole('status')).toHaveTextContent('Fehlgeschlagen: 1');
    });

    it('limits concurrent batch requests', async () => {
        vi.spyOn(apiClient, 'getAdminSession').mockResolvedValue(undefined);
        vi.spyOn(apiClient, 'getTemplates').mockResolvedValue([]);
        let maxActive = 0;
        let active = 0;
        let release!: () => void;
        const gate = new Promise<void>((resolve) => {
            release = resolve;
        });
        const createTemplate = vi.spyOn(apiClient, 'createTemplate').mockImplementation(async (name) => {
            active += 1;
            maxActive = Math.max(maxActive, active);
            await gate;
            active -= 1;
            return {id: `t_v1_${name}`, name};
        });

        renderAdmin('/admin/templates');

        await screen.findByRole('heading', {name: 'Optionsvorlagen', level: 3});
        fireEvent.change(screen.getByLabelText('Mehrere Vorlagen (kommagetrennt)'), {target: {value: 'one, two, three, four, five'}});
        fireEvent.click(screen.getByRole('button', {name: 'Importieren'}));
        await waitFor(() => expect(createTemplate).toHaveBeenCalledTimes(3));
        expect(maxActive).toBe(3);
        release();
        expect(await screen.findByText('Import-Ergebnis')).toBeVisible();
    });

    it('creates and renames an individual option template', async () => {
        vi.spyOn(apiClient, 'getAdminSession').mockResolvedValue(undefined);
        vi.spyOn(apiClient, 'getTemplates').mockResolvedValue([{id: 't_v1_existing', name: 'alpha'}]);
        const createTemplate = vi.spyOn(apiClient, 'createTemplate').mockResolvedValue({
            id: 't_v1_new',
            name: 'new template'
        });
        const renameTemplate = vi.spyOn(apiClient, 'renameTemplate').mockResolvedValue({
            id: 't_v1_existing',
            name: 'renamed'
        });

        renderAdmin('/admin/templates');

        await screen.findByRole('heading', {name: 'Optionsvorlagen', level: 3});
        fireEvent.change(screen.getByLabelText('Neue Optionsvorlage'), {target: {value: ' New Template '}});
        fireEvent.click(screen.getByRole('button', {name: 'Vorlage anlegen'}));
        await waitFor(() => expect(createTemplate).toHaveBeenCalledWith('New Template'));
        fireEvent.click(screen.getByRole('button', {name: 'Umbenennen'}));
        fireEvent.change(screen.getByRole('textbox', {name: 'Vorlage umbenennen alpha'}), {target: {value: 'Renamed'}});
        fireEvent.click(screen.getByRole('button', {name: 'Speichern'}));
        await waitFor(() => expect(renameTemplate).toHaveBeenCalledWith('t_v1_existing', 'Renamed'));
    });

    it('requires confirmation for global template deletion', async () => {
        vi.spyOn(apiClient, 'getAdminSession').mockResolvedValue(undefined);
        vi.spyOn(apiClient, 'getTemplates').mockResolvedValue([{id: 't_v1_existing', name: 'alpha'}]);
        const deleteTemplate = vi.spyOn(apiClient, 'deleteTemplate').mockResolvedValue(undefined);
        const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);

        renderAdmin('/admin/templates');

        await screen.findByRole('heading', {name: 'Optionsvorlagen', level: 3});
        fireEvent.click(screen.getByRole('checkbox', {name: 'Vorlage auswählen alpha'}));
        fireEvent.click(screen.getByRole('button', {name: /Ausgewählte löschen/}));

        expect(confirm).toHaveBeenCalled();
        expect(deleteTemplate).not.toHaveBeenCalled();
    });

    it('reports partial results when deleting multiple templates', async () => {
        vi.spyOn(apiClient, 'getAdminSession').mockResolvedValue(undefined);
        vi.spyOn(apiClient, 'getTemplates').mockResolvedValue([{id: 't_v1_one', name: 'One'}, {
            id: 't_v1_two',
            name: 'Two'
        }]);
        const deleteTemplate = vi.spyOn(apiClient, 'deleteTemplate').mockImplementation(async (id) => {
            if (id === 't_v1_two') throw problemError({status: 409, code: 'conflict'}, 409);
        });
        vi.spyOn(window, 'confirm').mockReturnValue(true);

        renderAdmin('/admin/templates');

        await screen.findByRole('heading', {name: 'Optionsvorlagen', level: 3});
        fireEvent.click(screen.getByRole('checkbox', {name: 'Sichtbare auswählen'}));
        fireEvent.click(screen.getByRole('button', {name: 'Ausgewählte löschen (2)'}));

        expect(await screen.findByText('Lösch-Ergebnis')).toBeVisible();
        expect(deleteTemplate).toHaveBeenCalledTimes(2);
        expect(screen.getByRole('status')).toHaveTextContent('Gelöscht: 1');
        expect(screen.getByRole('status')).toHaveTextContent('Fehlgeschlagen: 1');
        expect(screen.getByRole('status')).toHaveTextContent('Two');
    });

    it('adds and removes memberships without deleting the global template', async () => {
        vi.spyOn(apiClient, 'getAdminSession').mockResolvedValue(undefined);
        vi.spyOn(apiClient, 'getGroups').mockResolvedValue([{id: 'g_v1_group', name: 'Board', description: 'A board'}]);
        vi.spyOn(apiClient, 'getTemplates').mockResolvedValue([{id: 't_v1_one', name: 'One'}, {
            id: 't_v1_two',
            name: 'Two'
        }]);
        vi.spyOn(apiClient, 'getTemplatesInGroup').mockResolvedValue([{id: 't_v1_one', name: 'One'}]);
        const assign = vi.spyOn(apiClient, 'assignTemplateToGroup').mockResolvedValue(undefined);
        const remove = vi.spyOn(apiClient, 'removeTemplateFromGroup').mockResolvedValue(undefined);
        const deleteTemplate = vi.spyOn(apiClient, 'deleteTemplate').mockResolvedValue(undefined);

        renderAdmin('/admin/groups');

        expect(await screen.findByRole('heading', {name: 'Vorlagengruppen', level: 3})).toBeVisible();
        expect(await screen.findByText('One')).toBeVisible();
        fireEvent.change(screen.getByLabelText('Vorlage hinzufügen'), {target: {value: 't_v1_two'}});
        fireEvent.click(screen.getByRole('button', {name: 'Hinzufügen'}));
        await waitFor(() => expect(assign).toHaveBeenCalledWith('g_v1_group', 't_v1_two'));
        fireEvent.click(screen.getByRole('button', {name: 'Mitgliedschaft entfernen'}));
        await waitFor(() => expect(remove).toHaveBeenCalledWith('g_v1_group', 't_v1_one'));
        expect(deleteTemplate).not.toHaveBeenCalled();
    });

    it('creates, renames, and deletes a template group explicitly', async () => {
        vi.spyOn(apiClient, 'getAdminSession').mockResolvedValue(undefined);
        const groups = [{id: 'g_v1_group', name: 'Board', description: 'A board'}];
        vi.spyOn(apiClient, 'getGroups').mockImplementation(async () => groups);
        vi.spyOn(apiClient, 'getTemplates').mockResolvedValue([]);
        const createGroup = vi.spyOn(apiClient, 'createGroup').mockImplementation(async ({name, description}) => {
            const created = {id: 'g_v1_new', name, description};
            groups.push(created);
            return created;
        });
        const renameGroup = vi.spyOn(apiClient, 'renameGroup').mockImplementation(async (id, name) => {
            const group = groups.find((entry) => entry.id === id);
            if (!group) throw new Error('missing group');
            group.name = name;
            return group;
        });
        const deleteGroup = vi.spyOn(apiClient, 'deleteGroup').mockImplementation(async (id) => {
            const index = groups.findIndex((entry) => entry.id === id);
            groups.splice(index, 1);
        });
        vi.spyOn(apiClient, 'getTemplatesInGroup').mockResolvedValue([]);
        vi.spyOn(window, 'confirm').mockReturnValue(true);

        renderAdmin('/admin/groups');

        await screen.findByRole('heading', {name: 'Vorlagengruppen', level: 3});
        fireEvent.change(screen.getByLabelText('Neue Vorlagengruppe'), {target: {value: 'New Board'}});
        fireEvent.change(screen.getByLabelText('Beschreibung'), {target: {value: 'New description'}});
        fireEvent.click(screen.getByRole('button', {name: 'Gruppe anlegen'}));
        await waitFor(() => expect(createGroup).toHaveBeenCalledWith({
            name: 'New Board',
            description: 'New description'
        }));
        fireEvent.change(screen.getByLabelText('Gruppe umbenennen'), {target: {value: 'Renamed Board'}});
        fireEvent.click(screen.getByRole('button', {name: 'Speichern'}));
        await waitFor(() => expect(renameGroup).toHaveBeenCalledWith('g_v1_new', 'Renamed Board'));
        fireEvent.click(screen.getByRole('button', {name: 'Löschen'}));
        await waitFor(() => expect(deleteGroup).toHaveBeenCalledWith('g_v1_new'));
    });
});

type TestAdminVote = components['schemas']['AdminVote'];

function testAdminVote(id: string, pollId: string, pollTitle: string, userID: string, optionText = 'Yes'): TestAdminVote {
    return {
        voteId: id,
        userID,
        votedAt: '2026-08-31T12:00:00.000Z',
        poll: {id: pollId, title: pollTitle},
        option: {number: 1, text: optionText},
    };
}

describe('Admin vote administration', () => {
    it('loads all pages for global metrics and paginates the visible votes', async () => {
        vi.spyOn(apiClient, 'getAdminSession').mockResolvedValue(undefined);
        const votes = [
            testAdminVote('v_v1_one', 'p_v1_alpha', 'Alpha', 'alice'),
            testAdminVote('v_v1_two', 'p_v1_alpha', 'Alpha', 'bob', 'No'),
        ];
        votes.push(...Array.from({length: 48}, (_, index) => testAdminVote(`v_v1_extra_${index}`, 'p_v1_alpha', 'Alpha', 'alice')));
        votes.push(testAdminVote('v_v1_three', 'p_v1_beta', 'Beta', 'alice'));
        const getAdminVotes = vi.spyOn(apiClient, 'getAdminVotes').mockImplementation(async (page = 0, size = 50) => ({
            votes: page === 0 ? votes.slice(0, 50) : votes.slice(50),
            page,
            size,
            totalElements: votes.length,
        }));

        renderAdmin('/admin/votes');

        expect(await screen.findByRole('heading', {name: 'Stimmen', level: 3})).toBeVisible();
        expect(screen.getByText('Aktuelle Stimmen').parentElement).toHaveTextContent('51');
        expect(screen.getByText('Betroffene Polls').parentElement).toHaveTextContent('2');
        expect(screen.getByText('Unterschiedliche Identitäten').parentElement).toHaveTextContent('2');
        const voteList = screen.getByRole('list');
        expect(within(voteList).getAllByText('Alpha')).toHaveLength(50);
        expect(within(voteList).queryByText('Beta')).toBeNull();
        expect(getAdminVotes).toHaveBeenCalledWith(0, 50);
        expect(getAdminVotes).toHaveBeenCalledWith(1, 50);

        fireEvent.change(screen.getByLabelText('Poll filtern'), {target: {value: 'p_v1_beta'}});
        expect(await within(voteList).findByText('Beta')).toBeVisible();
        expect(within(voteList).queryByText('Alpha')).toBeNull();
        fireEvent.change(screen.getByLabelText('Poll filtern'), {target: {value: ''}});

        fireEvent.click(screen.getByRole('button', {name: 'Nächste Seite'}));

        expect(await within(voteList).findByText('Beta')).toBeVisible();
        expect(screen.getByText('Seite 2 von 2')).toBeVisible();
    });

    it('requires a trimmed reason and removes a vote after confirmation', async () => {
        vi.spyOn(apiClient, 'getAdminSession').mockResolvedValue(undefined);
        vi.spyOn(apiClient, 'getAdminVotes').mockResolvedValue({
            votes: [testAdminVote('v_v1_vote', 'p_v1_poll', 'A poll', 'alice')],
            page: 0,
            size: 50,
            totalElements: 1
        });
        const removeAdminVote = vi.spyOn(apiClient, 'removeAdminVote').mockResolvedValue(undefined);

        renderAdmin('/admin/votes');

        const vote = (await within(await screen.findByRole('list')).findByText('A poll')).closest('li');
        expect(vote).not.toBeNull();
        fireEvent.click(within(vote as HTMLElement).getByRole('button', {name: 'Stimme entfernen'}));

        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveTextContent('unveränderlich');
        const submit = within(dialog).getByRole('button', {name: 'Stimme entfernen'});
        expect(submit).toBeDisabled();
        fireEvent.change(within(dialog).getByRole('textbox', {name: 'Begründung'}), {target: {value: '  Regelverstoß  '}});
        expect(submit).toBeEnabled();
        fireEvent.click(submit);

        await waitFor(() => expect(removeAdminVote).toHaveBeenCalledWith('v_v1_vote', 'Regelverstoß'));
        expect(await screen.findByText('Noch keine Daten vorhanden')).toBeVisible();
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('keeps the vote and entered reason visible when removal fails', async () => {
        vi.spyOn(apiClient, 'getAdminSession').mockResolvedValue(undefined);
        vi.spyOn(apiClient, 'getAdminVotes').mockResolvedValue({
            votes: [testAdminVote('v_v1_vote', 'p_v1_poll', 'A poll', 'alice')],
            page: 0,
            size: 50,
            totalElements: 1
        });
        vi.spyOn(apiClient, 'removeAdminVote').mockRejectedValue(problemError({
            status: 409,
            code: 'vote_conflict'
        }, 409));

        renderAdmin('/admin/votes');

        const vote = (await within(await screen.findByRole('list')).findByText('A poll')).closest('li');
        fireEvent.click(within(vote as HTMLElement).getByRole('button', {name: 'Stimme entfernen'}));
        const dialog = screen.getByRole('dialog');
        const reason = within(dialog).getByRole('textbox', {name: 'Begründung'});
        fireEvent.change(reason, {target: {value: '  Korrektur  '}});
        fireEvent.click(within(dialog).getByRole('button', {name: 'Stimme entfernen'}));

        expect(await screen.findByRole('alert')).toHaveTextContent('Der aktuelle Zustand erlaubt diese Aktion nicht.');
        expect(within(screen.getByRole('list')).getByText('A poll')).toBeVisible();
        expect(reason).toHaveValue('  Korrektur  ');
    });
});

type TestPoll = components['schemas']['Poll'];

function testPoll(state: TestPoll['state'], visibility: TestPoll['visibility'] = state === 'active' ? 'public' : 'private'): TestPoll {
    return {
        id: `p_v1_${state}_${visibility}`,
        title: state === 'active' ? `${state} ${visibility} poll` : `${state} poll`,
        visibility,
        state,
        createdAt: '2026-08-31T12:00:00.000Z',
        endsAt: state === 'draft' ? null : state === 'expired' ? '2000-01-01T00:00:00.000Z' : '2099-01-01T00:00:00.000Z',
        totalVotes: 0,
        templateGroup: {id: 'g_v1_group', name: 'Board', description: 'Snapshot description'},
        templateSnapshotOptions: [{number: 1, text: 'Snapshot yes'}, {number: 2, text: 'Snapshot no'}],
        options: [{number: 1, text: 'Current yes'}, {number: 2, text: 'Current no'}],
    };
}

describe('Admin poll lifecycle', () => {
    it('renders the exhaustive state/action matrix and draft snapshot', async () => {
        vi.spyOn(apiClient, 'getAdminSession').mockResolvedValue(undefined);
        vi.spyOn(apiClient, 'getAdminPolls').mockResolvedValue([
            testPoll('draft'),
            testPoll('active'),
            testPoll('active', 'private'),
            testPoll('expired'),
            testPoll('archived'),
            testPoll('deleted'),
        ]);

        const rendered = renderAdmin('/admin/polls');

        expect(await screen.findByRole('heading', {name: 'draft poll', level: 4})).toBeVisible();
        const expectedActions: Record<string, string[]> = {
            'draft poll': ['Veröffentlichen'],
            'active public poll': ['Privat schalten', 'Archivieren', 'Soft löschen'],
            'active private poll': ['Archivieren', 'Soft löschen'],
            'expired poll': ['Ablauf ändern', 'Archivieren', 'Wieder öffnen', 'Soft löschen'],
            'archived poll': ['Aus Archiv wiederherstellen', 'Soft löschen'],
            'deleted poll': ['Wiederherstellen', 'Permanent löschen'],
        };
        const cards = Array.from(rendered.container.querySelectorAll<HTMLElement>('.poll-admin-list > .poll-admin-card'));
        expect(cards).toHaveLength(6);
        expect(within(cards[0]).getByText(/Snapshot description/)).toBeVisible();
        expect(within(cards[0]).getByText('Snapshot yes')).toBeVisible();
        expect(within(cards[0]).getByText('Current yes')).toBeVisible();
        for (const card of cards) {
            const title = within(card).getByRole('heading', {level: 4}).textContent ?? '';
            for (const action of expectedActions[title]) expect(within(card).getByRole('button', {name: action})).toBeVisible();
        }
        expect(within(cards[0]).getByRole('button', {name: 'Optionen ersetzen'})).toBeVisible();
        expect(within(cards[2]).queryByRole('button', {name: 'Privat schalten'})).toBeNull();
        expect(within(cards[3]).getByRole('button', {name: 'Wieder öffnen'})).toBeDisabled();
    });

    it('only allows draft option replacement and publishes only with a future expiry', async () => {
        vi.spyOn(apiClient, 'getAdminSession').mockResolvedValue(undefined);
        vi.spyOn(apiClient, 'getAdminPolls').mockResolvedValue([testPoll('draft')]);
        const replacePollOptions = vi.spyOn(apiClient, 'replacePollOptions').mockResolvedValue(testPoll('draft'));
        const publishPoll = vi.spyOn(apiClient, 'publishPoll').mockResolvedValue(testPoll('active'));

        renderAdmin('/admin/polls');

        const card = (await screen.findByRole('heading', {name: 'draft poll', level: 4})).closest('li');
        expect(card).not.toBeNull();
        const scoped = within(card as HTMLElement);
        expect(scoped.getByRole('button', {name: 'Veröffentlichen'})).toBeDisabled();
        fireEvent.change(scoped.getByLabelText('Veröffentlichen'), {target: {value: '2099-01-01T12:00'}});
        expect(scoped.getByRole('button', {name: 'Veröffentlichen'})).toBeEnabled();
        fireEvent.click(scoped.getByRole('button', {name: 'Optionen ersetzen'}));
        fireEvent.change(scoped.getByLabelText('Optionen, eine pro Zeile'), {target: {value: 'First\nSecond'}});
        fireEvent.click(scoped.getByRole('button', {name: 'Speichern'}));
        await waitFor(() => expect(replacePollOptions).toHaveBeenCalledWith('p_v1_draft_private', ['First', 'Second']));
        fireEvent.click(scoped.getByRole('button', {name: 'Veröffentlichen'}));
        await waitFor(() => expect(publishPoll).toHaveBeenCalledWith('p_v1_draft_private', '2099-01-01T11:00:00.000Z'));
    });

    it('offers only non-empty template groups for poll creation', async () => {
        vi.spyOn(apiClient, 'getAdminSession').mockResolvedValue(undefined);
        vi.spyOn(apiClient, 'getGroups').mockResolvedValue([
            {id: 'g_v1_empty', name: 'Empty', description: ''},
            {id: 'g_v1_full', name: 'Full', description: ''},
        ]);
        vi.spyOn(apiClient, 'getTemplatesInGroup').mockImplementation(async (groupId) => groupId === 'g_v1_full' ? [{
            id: 't_v1_one',
            name: 'One'
        }] : []);

        renderAdmin('/admin/create');

        const select = await screen.findByLabelText('Vorlagengruppe');
        expect(within(select).queryByRole('option', {name: 'Empty'})).toBeNull();
        expect(within(select).getByRole('option', {name: 'Full'})).toBeVisible();
        expect(screen.getByRole('button', {name: 'Speichern'})).toBeDisabled();
        fireEvent.change(select, {target: {value: 'g_v1_full'}});
        expect(screen.getByRole('button', {name: 'Speichern'})).toBeEnabled();
    });

    it('requires one confirmation for soft delete and two for permanent delete', async () => {
        vi.spyOn(apiClient, 'getAdminSession').mockResolvedValue(undefined);
        vi.spyOn(apiClient, 'getAdminPolls').mockResolvedValue([testPoll('active'), testPoll('deleted')]);
        const deletePoll = vi.spyOn(apiClient, 'deletePoll').mockResolvedValue(testPoll('deleted'));
        const permanentlyDeletePoll = vi.spyOn(apiClient, 'permanentlyDeletePoll').mockResolvedValue(undefined);
        const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

        const rendered = renderAdmin('/admin/polls');

        await screen.findByRole('heading', {name: 'active public poll', level: 4});
        const cards = Array.from(rendered.container.querySelectorAll<HTMLElement>('.poll-admin-list > .poll-admin-card'));
        fireEvent.click(within(cards[0]).getByRole('button', {name: 'Soft löschen'}));
        fireEvent.click(within(cards[1]).getByRole('button', {name: 'Permanent löschen'}));
        await waitFor(() => expect(deletePoll).toHaveBeenCalledWith('p_v1_active_public'));
        await waitFor(() => expect(permanentlyDeletePoll).toHaveBeenCalledWith('p_v1_deleted_private'));
        expect(confirm).toHaveBeenCalledTimes(3);
    });
});

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
import {adminSession, mockSession, userSession} from '../../test/sessions';

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

/** The page title renders at once; the area's panel only after its data has loaded. */
async function findAdminPanel() {
    await waitFor(() => expect(document.querySelector('.admin-panel')).not.toBeNull());
}

/** Opens the collapsed row of a poll in the admin list and returns it. */
async function openPoll(title: string) {
    const toggle = await screen.findByRole('button', {name: title});
    if (toggle.getAttribute('aria-expanded') === 'false') fireEvent.click(toggle);
    return toggle.closest('li') as HTMLElement;
}

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

describe('AdminPage areas', () => {
    it('loads only the visible area while leaving navigation and sign-in to the shell', async () => {
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

        expect(await screen.findByRole('heading', {name: 'Stimmen', level: 1})).toBeVisible();
        await findAdminPanel();
        expect(screen.queryAllByRole('link')).toHaveLength(0);
        expect(screen.queryByLabelText('Benutzername')).toBeNull();
        expect(getAdminVotes).toHaveBeenCalledTimes(1);
        expect(getAdminPolls).not.toHaveBeenCalled();
        expect(getGroups).not.toHaveBeenCalled();
        expect(getTemplates).not.toHaveBeenCalled();
    });
});

describe('AdminPage section titles', () => {
    const sections = [
        ['/admin/votes', 'Stimmen', 'Aktuelle Stimmen suchen und bei Bedarf entfernen.'],
        ['/admin/polls', 'Abstimmungen', 'Abstimmungen anlegen, veröffentlichen und verwalten.'],
        ['/admin/groups', 'Vorlagengruppen', 'Optionsvorlagen zu Gruppen für neue Abstimmungen zusammenstellen.'],
        ['/admin/templates', 'Optionsvorlagen', 'Wiederverwendbare Optionen anlegen, umbenennen und löschen.'],
        ['/admin/accounts', 'Konten', 'Konten sperren, entsperren und Einmalpasswörter vergeben.'],
        ['/admin/invitations', 'Einladungen', 'Personen per E-Mail oder Kontaktdatei einladen.'],
    ] as const;

    it.each(sections)('names %s after its area', async (path, title, description) => {
        mockSession(adminSession());
        vi.spyOn(apiClient, 'getAdminVotes').mockResolvedValue({votes: [], page: 0, size: 50, totalElements: 0});
        vi.spyOn(apiClient, 'getAdminPolls').mockResolvedValue([]);
        vi.spyOn(apiClient, 'getGroups').mockResolvedValue([]);
        vi.spyOn(apiClient, 'getTemplates').mockResolvedValue([]);
        vi.spyOn(apiClient, 'getAccounts').mockResolvedValue([]);
        vi.spyOn(apiClient, 'getInvitations').mockResolvedValue([]);

        renderAdmin(path);

        expect(await screen.findByRole('heading', {name: title, level: 1})).toBeVisible();
        expect(screen.getByText(description)).toBeVisible();
        expect(screen.queryByText('Anmeldung und Verwaltung.')).toBeNull();
        expect(screen.queryByRole('heading', {name: 'Administration'})).toBeNull();
        expect(screen.getAllByRole('heading', {name: title})).toHaveLength(1);
        expect(document.title).toBe(`${title} · JustVotes`);
    });
});

describe('Admin forms (spec 009, US4)', () => {
    it('labels the new group fields and reports an empty name at the field', async () => {
        mockSession(adminSession());
        vi.spyOn(apiClient, 'getGroups').mockResolvedValue([]);
        vi.spyOn(apiClient, 'getTemplates').mockResolvedValue([]);
        const createGroup = vi.spyOn(apiClient, 'createGroup');

        renderAdmin('/admin/groups');
        await findAdminPanel();

        expect(screen.getByLabelText('Beschreibung (optional)')).toBeVisible();
        const name = screen.getByLabelText('Name');
        const button = screen.getByRole('button', {name: 'Gruppe anlegen'});
        expect(button).toBeEnabled();
        fireEvent.click(button);
        expect(createGroup).not.toHaveBeenCalled();
        expect(name).toHaveAttribute('aria-invalid', 'true');
        expect(name).toHaveAccessibleDescription('Bitte fülle dieses Feld aus.');
        expect(name).toHaveFocus();
    });

    it('reports an empty template name at the field', async () => {
        mockSession(adminSession());
        vi.spyOn(apiClient, 'getTemplates').mockResolvedValue([]);
        const createTemplate = vi.spyOn(apiClient, 'createTemplate');

        renderAdmin('/admin/templates');
        await findAdminPanel();

        fireEvent.click(screen.getByRole('button', {name: 'Vorlage anlegen'}));
        expect(createTemplate).not.toHaveBeenCalled();
        expect(screen.getByLabelText('Neue Optionsvorlage')).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByLabelText('Vorlagen filtern')).toHaveAccessibleDescription('* steht für beliebige Zeichen');
    });

    it('labels the inline template rename field and reports an empty name there', async () => {
        mockSession(adminSession());
        vi.spyOn(apiClient, 'getTemplates').mockResolvedValue([{id: 't_v1_ja', name: 'Ja'}]);
        const renameTemplate = vi.spyOn(apiClient, 'renameTemplate');

        renderAdmin('/admin/templates');
        await findAdminPanel();
        fireEvent.click(screen.getByRole('button', {name: 'Umbenennen'}));
        const field = screen.getByLabelText('Vorlage umbenennen');
        fireEvent.change(field, {target: {value: '   '}});
        fireEvent.click(screen.getByRole('button', {name: 'Speichern'}));

        expect(renameTemplate).not.toHaveBeenCalled();
        expect(field).toHaveAttribute('aria-invalid', 'true');
        expect(field).toHaveFocus();
        expect(screen.getByRole('button', {name: 'Löschen: Ja'}).closest('.action-group-danger')).not.toBeNull();
    });

    it('reports an empty invitation address at the field', async () => {
        mockSession(adminSession());
        vi.spyOn(apiClient, 'getInvitations').mockResolvedValue([]);
        const createInvitation = vi.spyOn(apiClient, 'createInvitation');

        renderAdmin('/admin/invitations');
        await findAdminPanel();

        const button = screen.getByRole('button', {name: 'Einladen'});
        expect(button).toBeEnabled();
        fireEvent.click(button);
        expect(createInvitation).not.toHaveBeenCalled();
        const email = screen.getByLabelText('E-Mail-Adresse');
        expect(email).toHaveAttribute('aria-invalid', 'true');
        await waitFor(() => expect(email).toHaveFocus());
    });

    it('reports a missing title and group when saving a new poll', async () => {
        mockSession(adminSession());
        vi.spyOn(apiClient, 'getAdminPolls').mockResolvedValue([]);
        vi.spyOn(apiClient, 'getGroups').mockResolvedValue([{id: 'g_v1_full', name: 'Full', description: ''}]);
        vi.spyOn(apiClient, 'getTemplatesInGroup').mockResolvedValue([{id: 't_v1_one', name: 'One'}]);
        const createPoll = vi.spyOn(apiClient, 'createPoll');

        renderAdmin('/admin/polls');
        fireEvent.click(await screen.findByRole('button', {name: 'Neue Abstimmung'}));
        await screen.findByLabelText('Abstimmungs-Titel');
        fireEvent.click(screen.getByRole('button', {name: 'Speichern'}));

        expect(createPoll).not.toHaveBeenCalled();
        expect(screen.getByLabelText('Abstimmungs-Titel')).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByLabelText('Vorlagengruppe')).toHaveAttribute('aria-invalid', 'true');
        await waitFor(() => expect(screen.getByLabelText('Abstimmungs-Titel')).toHaveFocus());
    });
});

describe('AdminPage template catalog', () => {
    it('searches templates and paginates in pages of twenty', async () => {
        mockSession(adminSession());
        vi.spyOn(apiClient, 'getTemplates').mockResolvedValue(Array.from({length: 21}, (_, index) => ({
            id: `t_v1_${index + 1}`,
            name: `Template ${index + 1}`
        })));

        renderAdmin('/admin/templates');

        expect(await screen.findByRole('heading', {name: 'Optionsvorlagen', level: 1})).toBeVisible();
        await findAdminPanel();
        expect(screen.getAllByRole('listitem')).toHaveLength(20);
        fireEvent.click(screen.getByRole('button', {name: 'Weiter'}));
        expect(screen.getByText('Template 21')).toBeVisible();
        expect(screen.getAllByRole('listitem')).toHaveLength(1);
        fireEvent.change(screen.getByLabelText('Vorlagen filtern'), {target: {value: '*Template 2*'}});
        expect(screen.getByText('Template 2')).toBeVisible();
        expect(screen.getByText('Template 20')).toBeVisible();
    });

    it('trims batch values and reports partial failures', async () => {
        mockSession(adminSession());
        vi.spyOn(apiClient, 'getTemplates').mockResolvedValue([{id: 't_v1_existing', name: 'alpha'}]);
        const createTemplate = vi.spyOn(apiClient, 'createTemplate').mockImplementation(async (name) => {
            if (name.toLowerCase() === 'beta') throw problemError({status: 409, code: 'conflict'}, 409);
            return {id: 't_v1_gamma', name};
        });

        renderAdmin('/admin/templates');

        await screen.findByRole('heading', {name: 'Optionsvorlagen', level: 1});
        await findAdminPanel();
        fireEvent.change(screen.getByLabelText('Mehrere Vorlagen (kommagetrennt)'), {target: {value: ' Alpha, , Beta, beta, Gamma, Delta, Epsilon, Zeta '}});
        fireEvent.click(screen.getByRole('button', {name: 'Importieren'}));

        expect(await screen.findByText('Import-Ergebnis')).toBeVisible();
        expect(createTemplate.mock.calls.map(([name]) => name)).toEqual(['Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta']);
        expect(screen.getByRole('status')).toHaveTextContent('Erstellt: 4');
        expect(screen.getByRole('status')).toHaveTextContent('Gamma');
        expect(screen.getByRole('status')).toHaveTextContent('Delta');
        expect(screen.getByRole('status')).toHaveTextContent('Epsilon');
        expect(screen.getByRole('status')).toHaveTextContent('Zeta');
        expect(screen.getByRole('status')).toHaveTextContent('Übersprungen: 3');
        expect(screen.getByRole('status')).toHaveTextContent('Leerer Wert');
        expect(screen.getByRole('status')).toHaveTextContent('Fehlgeschlagen: 1');
        expect(screen.getByLabelText('Mehrere Vorlagen (kommagetrennt)')).toHaveValue('Beta');
    });

    it('serializes batch requests', async () => {
        mockSession(adminSession());
        vi.spyOn(apiClient, 'getTemplates').mockResolvedValue([]);
        let maxActive = 0;
        let active = 0;
        const createTemplate = vi.spyOn(apiClient, 'createTemplate').mockImplementation(async (name) => {
            active += 1;
            maxActive = Math.max(maxActive, active);
            await Promise.resolve();
            active -= 1;
            return {id: `t_v1_${name}`, name};
        });

        renderAdmin('/admin/templates');

        await screen.findByRole('heading', {name: 'Optionsvorlagen', level: 1});
        await findAdminPanel();
        fireEvent.change(screen.getByLabelText('Mehrere Vorlagen (kommagetrennt)'), {target: {value: 'one, two, three, four, five'}});
        fireEvent.click(screen.getByRole('button', {name: 'Importieren'}));
        expect(await screen.findByText('Import-Ergebnis')).toBeVisible();
        expect(createTemplate).toHaveBeenCalledTimes(5);
        expect(maxActive).toBe(1);
    });

    it('shows a pending status while creating a template', async () => {
        mockSession(adminSession());
        vi.spyOn(apiClient, 'getTemplates').mockResolvedValue([]);
        let release!: () => void;
        const pending = new Promise<{ id: string; name: string }>((resolve) => {
            release = () => resolve({id: 't_v1_pending', name: 'Pending'});
        });
        const createTemplate = vi.spyOn(apiClient, 'createTemplate').mockReturnValue(pending);

        renderAdmin('/admin/templates');

        await screen.findByRole('heading', {name: 'Optionsvorlagen', level: 1});
        await findAdminPanel();
        fireEvent.change(screen.getByLabelText('Neue Optionsvorlage'), {target: {value: 'Pending'}});
        fireEvent.click(screen.getByRole('button', {name: 'Vorlage anlegen'}));

        expect(await screen.findByRole('status')).toHaveTextContent('Speichern läuft');
        expect(screen.getByRole('button', {name: 'Vorlage anlegen'})).toBeDisabled();
        release();
        await waitFor(() => expect(createTemplate).toHaveBeenCalledWith('Pending'));
    });

    it('creates and renames an individual option template', async () => {
        mockSession(adminSession());
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

        await screen.findByRole('heading', {name: 'Optionsvorlagen', level: 1});
        await findAdminPanel();
        fireEvent.change(screen.getByLabelText('Neue Optionsvorlage'), {target: {value: ' New Template '}});
        fireEvent.click(screen.getByRole('button', {name: 'Vorlage anlegen'}));
        await waitFor(() => expect(createTemplate).toHaveBeenCalledWith('New Template'));
        fireEvent.click(screen.getByRole('button', {name: 'Umbenennen'}));
        fireEvent.change(screen.getByRole('textbox', {name: 'Vorlage umbenennen'}), {target: {value: 'Renamed'}});
        fireEvent.click(screen.getByRole('button', {name: 'Speichern'}));
        await waitFor(() => expect(renameTemplate).toHaveBeenCalledWith('t_v1_existing', 'Renamed'));
    });

    it('requires confirmation for global template deletion', async () => {
        mockSession(adminSession());
        vi.spyOn(apiClient, 'getTemplates').mockResolvedValue([{id: 't_v1_existing', name: 'alpha'}]);
        const deleteTemplate = vi.spyOn(apiClient, 'deleteTemplate').mockResolvedValue(undefined);
        const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);

        renderAdmin('/admin/templates');

        await screen.findByRole('heading', {name: 'Optionsvorlagen', level: 1});
        await findAdminPanel();
        fireEvent.click(screen.getByRole('checkbox', {name: 'Vorlage auswählen alpha'}));
        fireEvent.click(screen.getByRole('button', {name: /Ausgewählte löschen/}));

        expect(confirm).toHaveBeenCalled();
        expect(deleteTemplate).not.toHaveBeenCalled();
    });

    it('reports partial results when deleting multiple templates', async () => {
        mockSession(adminSession());
        vi.spyOn(apiClient, 'getTemplates').mockResolvedValue([{id: 't_v1_one', name: 'One'}, {
            id: 't_v1_two',
            name: 'Two'
        }]);
        const deleteTemplate = vi.spyOn(apiClient, 'deleteTemplate').mockImplementation(async (id) => {
            if (id === 't_v1_two') throw problemError({status: 409, code: 'conflict'}, 409);
        });
        vi.spyOn(window, 'confirm').mockReturnValue(true);

        renderAdmin('/admin/templates');

        await screen.findByRole('heading', {name: 'Optionsvorlagen', level: 1});
        await findAdminPanel();
        fireEvent.click(screen.getByRole('checkbox', {name: 'Sichtbare auswählen'}));
        fireEvent.click(screen.getByRole('button', {name: 'Ausgewählte löschen (2)'}));

        expect(await screen.findByText('Lösch-Ergebnis')).toBeVisible();
        expect(deleteTemplate).toHaveBeenCalledTimes(2);
        expect(screen.getByRole('status')).toHaveTextContent('Gelöscht: 1');
        expect(screen.getByRole('status')).toHaveTextContent('Fehlgeschlagen: 1');
        expect(screen.getByRole('status')).toHaveTextContent('Two');
        expect(screen.getByRole('checkbox', {name: 'Vorlage auswählen Two'})).toBeChecked();
    });

    it('retries only the failed template deletion', async () => {
        mockSession(adminSession());
        vi.spyOn(apiClient, 'getTemplates').mockResolvedValue([{id: 't_v1_one', name: 'One'}, {
            id: 't_v1_two',
            name: 'Two'
        }]);
        let attempts = 0;
        const deleteTemplate = vi.spyOn(apiClient, 'deleteTemplate').mockImplementation(async (id) => {
            if (id === 't_v1_two' && attempts++ === 0) throw problemError({status: 409, code: 'conflict'}, 409);
        });
        vi.spyOn(window, 'confirm').mockReturnValue(true);

        renderAdmin('/admin/templates');

        await screen.findByRole('heading', {name: 'Optionsvorlagen', level: 1});
        await findAdminPanel();
        fireEvent.click(screen.getByRole('checkbox', {name: 'Vorlage auswählen Two'}));
        fireEvent.click(screen.getByRole('button', {name: 'Ausgewählte löschen (1)'}));
        await screen.findByText('Lösch-Ergebnis');

        fireEvent.click(screen.getByRole('button', {name: 'Ausgewählte löschen (1)'}));

        await waitFor(() => expect(deleteTemplate).toHaveBeenCalledTimes(2));
        expect(screen.getByRole('status')).toHaveTextContent('Gelöscht: 1');
        expect(screen.getByRole('status')).toHaveTextContent('Fehlgeschlagen: 0');
    });

    it('shows the members group as automatic and read-only', async () => {
        mockSession(adminSession());
        vi.spyOn(apiClient, 'getGroups').mockResolvedValue([{id: 'g_v1_members', name: 'Alle Mitglieder', description: '', kind: 'members'}]);
        vi.spyOn(apiClient, 'getTemplates').mockResolvedValue([{id: 't_v1_anna', name: 'Anna', managed: true}]);
        vi.spyOn(apiClient, 'getTemplatesInGroup').mockResolvedValue([{id: 't_v1_anna', name: 'Anna', managed: true}]);

        renderAdmin('/admin/groups');

        expect(await screen.findByRole('button', {name: 'Alle Mitglieder Automatisch'})).toBeVisible();
        expect(await screen.findByText('Anna')).toBeVisible();
        expect(screen.getByText(/enthält automatisch alle Mitglieder/)).toBeVisible();
        expect(screen.queryByLabelText('Gruppe umbenennen')).not.toBeInTheDocument();
        expect(screen.queryByRole('checkbox', {name: 'Vorlage auswählen Anna'})).not.toBeInTheDocument();
    });

    it('hides rename and delete for member templates', async () => {
        mockSession(adminSession());
        vi.spyOn(apiClient, 'getTemplates').mockResolvedValue([{id: 't_v1_anna', name: 'Anna', managed: true}, {id: 't_v1_ja', name: 'Ja', managed: false}]);

        renderAdmin('/admin/templates');

        const anna = (await screen.findByRole('checkbox', {name: 'Vorlage auswählen Anna'})).closest('li') as HTMLElement;
        expect(anna).toHaveTextContent('Automatisch');
        expect(within(anna).getByRole('checkbox')).toBeDisabled();
        expect(within(anna).queryByRole('button', {name: 'Löschen: Anna'})).not.toBeInTheDocument();
        const ja = screen.getByRole('checkbox', {name: 'Vorlage auswählen Ja'}).closest('li') as HTMLElement;
        expect(within(ja).getByRole('button', {name: 'Löschen: Ja'})).toBeVisible();
    });

    it('adds and removes memberships without deleting the global template', async () => {
        mockSession(adminSession());
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

        expect(await screen.findByRole('heading', {name: 'Vorlagengruppen', level: 1})).toBeVisible();
        await findAdminPanel();
        const one = await screen.findByRole('checkbox', {name: 'Vorlage auswählen One'});
        expect(one).toBeChecked();
        fireEvent.click(one);
        await waitFor(() => expect(remove).toHaveBeenCalledWith('g_v1_group', 't_v1_one'));
        fireEvent.click(screen.getByRole('checkbox', {name: 'Vorlage auswählen Two'}));
        await waitFor(() => expect(assign).toHaveBeenCalledWith('g_v1_group', 't_v1_two'));
        expect(deleteTemplate).not.toHaveBeenCalled();
    });

    it('adds selected memberships serially and shows partial failures', async () => {
        mockSession(adminSession());
        vi.spyOn(apiClient, 'getGroups').mockResolvedValue([{id: 'g_v1_group', name: 'Board', description: ''}]);
        vi.spyOn(apiClient, 'getTemplates').mockResolvedValue([{id: 't_v1_one', name: 'One'}, {
            id: 't_v1_two',
            name: 'Two'
        }, {id: 't_v1_three', name: 'Three'}]);
        const getTemplatesInGroup = vi.spyOn(apiClient, 'getTemplatesInGroup').mockResolvedValue([]);
        const memberships: Array<{ id: string; name: string }> = [];
        getTemplatesInGroup.mockImplementation(async () => memberships);
        const assign = vi.spyOn(apiClient, 'assignTemplateToGroup').mockImplementation(async (_groupId, templateId) => {
            if (templateId === 't_v1_two') throw problemError({status: 409, code: 'conflict'}, 409);
            let name = 'Two';
            if (templateId === 't_v1_one') name = 'One';
            memberships.push({id: templateId, name});
        });

        renderAdmin('/admin/groups');

        expect(await screen.findByRole('heading', {name: 'Vorlagengruppen', level: 1})).toBeVisible();
        await findAdminPanel();
        const one = screen.getByRole('checkbox', {name: 'Vorlage auswählen One'});
        fireEvent.click(one);
        await waitFor(() => expect(assign).toHaveBeenCalledWith('g_v1_group', 't_v1_one'));
        const two = screen.getByRole('checkbox', {name: 'Vorlage auswählen Two'});
        fireEvent.click(two);
        await waitFor(() => expect(assign).toHaveBeenCalledWith('g_v1_group', 't_v1_two'));
        await waitFor(() => expect(one).toBeChecked());
        expect(two).not.toBeChecked();
        expect(screen.getByRole('alert')).toBeVisible();
    });

    it('filters all templates with globs and applies select all immediately', async () => {
        mockSession(adminSession());
        vi.spyOn(apiClient, 'getGroups').mockResolvedValue([{id: 'g_v1_group', name: 'Board', description: ''}]);
        vi.spyOn(apiClient, 'getTemplates').mockResolvedValue([
            {id: 't_v1_one', name: 'Board One'},
            {id: 't_v1_two', name: 'Board Two'},
            {id: 't_v1_other', name: 'Other'},
        ]);
        vi.spyOn(apiClient, 'getTemplatesInGroup').mockResolvedValue([]);
        const assign = vi.spyOn(apiClient, 'assignTemplateToGroup').mockResolvedValue(undefined);

        renderAdmin('/admin/groups');

        expect(await screen.findByRole('heading', {name: 'Vorlagengruppen', level: 1})).toBeVisible();
        await findAdminPanel();
        const filter = screen.getByLabelText('Vorlagen filtern');
        fireEvent.change(filter, {target: {value: 'Board *'}});
        expect(screen.getByRole('checkbox', {name: 'Vorlage auswählen Board One'})).toBeVisible();
        expect(screen.queryByRole('checkbox', {name: 'Vorlage auswählen Other'})).toBeNull();

        fireEvent.click(screen.getByRole('button', {name: 'Alle angezeigten hinzufügen'}));
        await waitFor(() => expect(assign).toHaveBeenCalledTimes(2));
        expect(assign).toHaveBeenNthCalledWith(1, 'g_v1_group', 't_v1_one');
        expect(assign).toHaveBeenNthCalledWith(2, 'g_v1_group', 't_v1_two');

        fireEvent.change(filter, {target: {value: 'Other'}});
        fireEvent.change(filter, {target: {value: 'Board *'}});
        expect(screen.getByRole('checkbox', {name: 'Vorlage auswählen Board One'})).toBeVisible();
        expect(screen.getByRole('checkbox', {name: 'Vorlage auswählen Board Two'})).toBeVisible();
    });

    it('creates, renames, and deletes a template group explicitly', async () => {
        mockSession(adminSession());
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

        await screen.findByRole('heading', {name: 'Vorlagengruppen', level: 1});
        await findAdminPanel();
        fireEvent.change(screen.getByLabelText('Name'), {target: {value: 'New Board'}});
        fireEvent.change(screen.getByLabelText('Beschreibung (optional)'), {target: {value: 'New description'}});
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

    it('translates template-group controls in English', async () => {
        window.localStorage.setItem('justvotes-locale', 'en');
        mockSession(adminSession());
        vi.spyOn(apiClient, 'getGroups').mockResolvedValue([{id: 'g_v1_group', name: 'Board', description: ''}]);
        vi.spyOn(apiClient, 'getTemplates').mockResolvedValue([]);
        vi.spyOn(apiClient, 'getTemplatesInGroup').mockResolvedValue([]);

        renderAdmin('/admin/groups');

        expect(await screen.findByRole('heading', {name: 'Template groups', level: 1})).toBeVisible();
        await findAdminPanel();
        expect(screen.getByLabelText('Rename group')).toBeVisible();
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
        mockSession(adminSession());
        const votes = [
            testAdminVote('v_v1_one', 'p_v1_alpha', 'Alpha', 'alice'),
            testAdminVote('v_v1_two', 'p_v1_alpha', 'Alpha', 'bob', 'No'),
        ];
        votes.push(...Array.from({length: 48}, (_, index) => testAdminVote(`v_v1_extra_${index}`, 'p_v1_alpha', 'Alpha', 'alice')));
        votes.push(testAdminVote('v_v1_three', 'p_v1_beta', 'Beta', 'alice'));
        const getAdminVotes = vi.spyOn(apiClient, 'getAdminVotes').mockImplementation(async (page = 0, size = 50) => {
            let pageVotes;
            if (page === 0) pageVotes = votes.slice(0, 50);
            else pageVotes = votes.slice(50);
            return {votes: pageVotes, page, size, totalElements: votes.length};
        });

        renderAdmin('/admin/votes');

        expect(await screen.findByRole('heading', {name: 'Stimmen', level: 1})).toBeVisible();
        await findAdminPanel();
        expect(screen.getByText('Aktuelle Stimmen').parentElement).toHaveTextContent('51');
        expect(screen.getByText('Betroffene Abstimmungen').parentElement).toHaveTextContent('2');
        expect(screen.getByText('Unterschiedliche Identitäten').parentElement).toHaveTextContent('2');
        const voteList = screen.getByRole('list');
        expect(within(voteList).getAllByText('Alpha')).toHaveLength(50);
        expect(within(voteList).queryByText('Beta')).toBeNull();
        expect(getAdminVotes).toHaveBeenCalledWith(0, 50);
        expect(getAdminVotes).toHaveBeenCalledWith(1, 50);

        fireEvent.change(screen.getByLabelText('Abstimmung filtern'), {target: {value: 'p_v1_beta'}});
        expect(await within(voteList).findByText('Beta')).toBeVisible();
        expect(within(voteList).queryByText('Alpha')).toBeNull();
        fireEvent.change(screen.getByLabelText('Abstimmung filtern'), {target: {value: ''}});

        fireEvent.click(screen.getByRole('button', {name: 'Nächste Seite'}));

        expect(await within(voteList).findByText('Beta')).toBeVisible();
        expect(screen.getByText('Seite 2 von 2')).toBeVisible();

        fireEvent.change(screen.getByLabelText('Stimmen suchen'), {target: {value: 'bob'}});
        expect(await within(voteList).findByText('bob')).toBeVisible();
        expect(within(voteList).queryByText('alice')).toBeNull();
        fireEvent.change(screen.getByLabelText('Stimmen suchen'), {target: {value: 'does-not-exist'}});
        expect(await screen.findByRole('heading', {name: 'Keine passenden Stimmen', level: 3})).toBeVisible();
    });

    it('requires a trimmed reason and removes a vote after confirmation', async () => {
        mockSession(adminSession());
        vi.spyOn(apiClient, 'getAdminVotes').mockResolvedValue({
            votes: [testAdminVote('v_v1_vote', 'p_v1_poll', 'A poll', 'alice')],
            page: 0,
            size: 50,
            totalElements: 1
        });
        const removeAdminVote = vi.spyOn(apiClient, 'removeAdminVote').mockResolvedValue(undefined);
        const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');

        renderAdmin('/admin/votes');

        const vote = (await within(await screen.findByRole('list')).findByText('A poll')).closest('li');
        expect(vote).not.toBeNull();
        expect(vote).not.toHaveTextContent('p_v1_poll');
        expect(vote).toHaveTextContent('Option 1: Yes');
        expect(vote).toHaveTextContent('v_v1_vote');
        const trigger = within(vote as HTMLElement).getByRole('button', {name: 'Stimme entfernen'});
        expect(trigger.closest('.action-group-danger')).not.toBeNull();
        fireEvent.click(trigger);

        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveTextContent('unveränderlich');
        expect(dialog).toHaveTextContent('Die Stimme von alice in „A poll“ wird entfernt.');
        const submit = within(dialog).getByRole('button', {name: 'Stimme entfernen'});
        expect(submit).toBeEnabled();
        fireEvent.click(submit);
        expect(removeAdminVote).not.toHaveBeenCalled();
        const reason = within(dialog).getByRole('textbox', {name: 'Begründung'});
        expect(reason).toHaveAttribute('aria-invalid', 'true');
        expect(reason).toHaveFocus();
        fireEvent.change(reason, {target: {value: '  Regelverstoß  '}});
        expect(reason).not.toHaveAttribute('aria-invalid', 'true');
        fireEvent.click(submit);

        await waitFor(() => expect(removeAdminVote).toHaveBeenCalledWith('v_v1_vote', 'Regelverstoß'));
        expect(invalidateQueries).toHaveBeenCalledWith({queryKey: queryKeys.adminVotesRoot});
        expect(invalidateQueries).toHaveBeenCalledWith({queryKey: queryKeys.publicPolls});
        expect(invalidateQueries).toHaveBeenCalledWith({queryKey: queryKeys.poll('p_v1_poll')});
        expect(invalidateQueries).toHaveBeenCalledWith({queryKey: queryKeys.pollResults('p_v1_poll')});
        expect(invalidateQueries).toHaveBeenCalledWith({queryKey: queryKeys.pollAudit('p_v1_poll')});
        expect(await screen.findByText('Noch keine Daten vorhanden')).toBeVisible();
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(screen.getByLabelText('Abstimmung filtern')).toHaveFocus();
    });

    it('traps removal dialog focus, closes with Escape, and restores the trigger focus', async () => {
        mockSession(adminSession());
        vi.spyOn(apiClient, 'getAdminVotes').mockResolvedValue({
            votes: [testAdminVote('v_v1_vote', 'p_v1_poll', 'A poll', 'alice')],
            page: 0,
            size: 50,
            totalElements: 1
        });

        renderAdmin('/admin/votes');

        const vote = (await within(await screen.findByRole('list')).findByText('A poll')).closest('li') as HTMLElement;
        const trigger = within(vote).getByRole('button', {name: 'Stimme entfernen'});
        fireEvent.click(trigger);

        const dialog = screen.getByRole('dialog');
        const reason = within(dialog).getByRole('textbox', {name: 'Begründung'});
        const cancel = within(dialog).getByRole('button', {name: 'Abbrechen'});
        expect(reason).toHaveFocus();
        trigger.focus();
        fireEvent.keyDown(document, {key: 'Tab'});
        expect(reason).toHaveFocus();
        fireEvent.keyDown(document, {key: 'Tab', shiftKey: true});
        expect(cancel).toHaveFocus();
        fireEvent.keyDown(document, {key: 'Tab'});
        expect(reason).toHaveFocus();
        fireEvent.keyDown(document, {key: 'Escape'});

        expect(screen.queryByRole('dialog')).toBeNull();
        expect(trigger).toHaveFocus();
    });

    it('disables duplicate removal and keeps the dialog open while pending', async () => {
        mockSession(adminSession());
        vi.spyOn(apiClient, 'getAdminVotes').mockResolvedValue({
            votes: [testAdminVote('v_v1_vote', 'p_v1_poll', 'A poll', 'alice')],
            page: 0,
            size: 50,
            totalElements: 1
        });
        let resolveRemoval!: () => void;
        const removalPending = new Promise<void>((resolve) => {
            resolveRemoval = resolve;
        });
        const removeAdminVote = vi.spyOn(apiClient, 'removeAdminVote').mockReturnValue(removalPending);

        renderAdmin('/admin/votes');

        const vote = (await within(await screen.findByRole('list')).findByText('A poll')).closest('li') as HTMLElement;
        fireEvent.click(within(vote).getByRole('button', {name: 'Stimme entfernen'}));
        const dialog = screen.getByRole('dialog');
        fireEvent.change(within(dialog).getByRole('textbox', {name: 'Begründung'}), {target: {value: 'Reason'}});
        const submit = within(dialog).getByRole('button', {name: 'Stimme entfernen'});
        expect(submit).toBeEnabled();
        fireEvent.click(submit);

        await waitFor(() => expect(removeAdminVote).toHaveBeenCalledTimes(1));
        expect(submit).toBeDisabled();
        expect(within(dialog).getByRole('button', {name: 'Abbrechen'})).toBeDisabled();
        fireEvent.keyDown(document, {key: 'Escape'});
        expect(screen.getByRole('dialog')).toBeVisible();
        resolveRemoval();
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });

    it('keeps the vote and entered reason visible when removal fails', async () => {
        mockSession(adminSession());
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

function testPoll(state: TestPoll['state'], visibility?: TestPoll['visibility']): TestPoll {
    if (visibility === undefined) {
        visibility = 'private';
        if (state === 'active') visibility = 'public';
    }
    let title = `${state} poll`;
    if (state === 'active') title = `${state} ${visibility} poll`;
    let endsAt: string | null = '2099-01-01T00:00:00.000Z';
    if (state === 'draft') endsAt = null;
    else if (state === 'expired') endsAt = '2000-01-01T00:00:00.000Z';
    return {
        id: `p_v1_${state}_${visibility}`,
        title,
        visibility,
        state,
        createdAt: '2026-08-31T12:00:00.000Z',
        endsAt,
        totalVotes: 0,
        templateGroup: {id: 'g_v1_group', name: 'Board', description: 'Snapshot description'},
        templateSnapshotOptions: [{number: 1, text: 'Snapshot yes'}, {number: 2, text: 'Snapshot no'}],
        options: [{number: 1, text: 'Current yes'}, {number: 2, text: 'Current no'}],
    };
}

describe('Admin poll list (spec 009, US3)', () => {
    it('shows every poll collapsed with its key facts', async () => {
        mockSession(adminSession());
        vi.spyOn(apiClient, 'getAdminPolls').mockResolvedValue([
            {...testPoll('expired', 'public'), endsAt: '2026-10-31T18:50:00.000Z', totalVotes: 1},
            testPoll('draft'),
        ]);

        renderAdmin('/admin/polls');

        const expired = await screen.findByRole('button', {name: 'expired poll'});
        expect(expired).toHaveAttribute('aria-expanded', 'false');
        const row = expired.closest('li') as HTMLElement;
        expect(row).toHaveTextContent(/öffentlich · abgelaufen · Ablauf .*31.*2026.* · 1 Stimme/);
        expect(within(row).queryByText('Current yes')).not.toBeVisible();
        const draftRow = screen.getByRole('button', {name: 'draft poll'}).closest('li') as HTMLElement;
        expect(draftRow).toHaveTextContent('kein Ablauf gesetzt');
        expect(draftRow).toHaveTextContent('0 Stimmen');
    });

    it('opens a poll with mouse or keyboard and shows options, actions and links', async () => {
        mockSession(adminSession());
        vi.spyOn(apiClient, 'getAdminPolls').mockResolvedValue([testPoll('expired')]);

        renderAdmin('/admin/polls');

        const toggle = await screen.findByRole('button', {name: 'expired poll'});
        fireEvent.click(toggle);
        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        const body = document.getElementById(toggle.getAttribute('aria-controls') ?? '') as HTMLElement;
        expect(within(body).getByText('Current yes')).toBeVisible();
        expect(within(body).getByRole('button', {name: 'Archivieren'})).toBeVisible();
        expect(within(body).getByRole('link', {name: 'Prüfprotokoll'})).toBeVisible();
        fireEvent.click(toggle);
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });

    it('shortens long option lists to ten until all are requested', async () => {
        mockSession(adminSession());
        const options = Array.from({length: 12}, (_, index) => ({number: index + 1, text: `Option ${index + 1}`}));
        vi.spyOn(apiClient, 'getAdminPolls').mockResolvedValue([{...testPoll('expired'), options}]);

        renderAdmin('/admin/polls');

        const row = await openPoll('expired poll');
        expect(within(row).getByText('Option 10')).toBeVisible();
        expect(within(row).queryByText('Option 11')).toBeNull();
        fireEvent.click(within(row).getByRole('button', {name: 'Alle 12 Optionen anzeigen'}));
        expect(within(row).getByText('Option 12')).toBeVisible();
    });

    it('keeps a poll open after an action', async () => {
        mockSession(adminSession());
        const getAdminPolls = vi.spyOn(apiClient, 'getAdminPolls').mockResolvedValue([testPoll('expired')]);
        const archived = {...testPoll('archived'), id: testPoll('expired').id};
        vi.spyOn(apiClient, 'archivePoll').mockImplementation(async () => {
            getAdminPolls.mockResolvedValue([archived]);
            return archived;
        });

        renderAdmin('/admin/polls');

        const row = await openPoll('expired poll');
        fireEvent.click(within(row).getByRole('button', {name: 'Archivieren'}));
        expect(await screen.findByRole('button', {name: 'archived poll', expanded: true})).toBeVisible();
    });

    it('opens the new poll form with focus and returns focus on cancel', async () => {
        mockSession(adminSession());
        vi.spyOn(apiClient, 'getAdminPolls').mockResolvedValue([]);
        vi.spyOn(apiClient, 'getGroups').mockResolvedValue([{id: 'g_v1_full', name: 'Full', description: ''}]);
        vi.spyOn(apiClient, 'getTemplatesInGroup').mockResolvedValue([{id: 't_v1_one', name: 'One'}]);

        renderAdmin('/admin/polls');

        expect(await screen.findByText('Noch keine Abstimmungen.')).toBeVisible();
        expect(screen.queryByLabelText('Abstimmungs-Titel')).toBeNull();
        const newPoll = screen.getByRole('button', {name: 'Neue Abstimmung'});
        fireEvent.click(newPoll);
        const title = await screen.findByLabelText('Abstimmungs-Titel');
        await waitFor(() => expect(title).toHaveFocus());
        fireEvent.change(title, {target: {value: 'Draft'}});
        fireEvent.click(screen.getByRole('button', {name: 'Abbrechen'}));
        expect(screen.queryByLabelText('Abstimmungs-Titel')).toBeNull();
        await waitFor(() => expect(newPoll).toHaveFocus());
    });
});

describe('Admin poll lifecycle', () => {
    it('renders the exhaustive state/action matrix and current options', async () => {
        mockSession(adminSession());
        vi.spyOn(apiClient, 'getAdminPolls').mockResolvedValue([
            testPoll('draft'),
            testPoll('active'),
            testPoll('active', 'private'),
            testPoll('expired'),
            testPoll('archived'),
            testPoll('deleted'),
        ]);

        const rendered = renderAdmin('/admin/polls');

        await screen.findByRole('button', {name: 'draft poll'});
        for (const toggle of screen.getAllByRole('button', {expanded: false}).filter((button) => button.classList.contains('poll-admin-toggle'))) fireEvent.click(toggle);
        const expectedActions: Record<string, string[]> = {
            'draft poll': ['Veröffentlichen'],
            'active public poll': ['Privat schalten', 'Archivieren', 'Löschen'],
            'active private poll': ['Archivieren', 'Löschen'],
            'expired poll': ['Ablauf ändern', 'Archivieren', 'Wieder öffnen', 'Löschen'],
            'archived poll': ['Aus Archiv wiederherstellen', 'Löschen'],
            'deleted poll': ['Wiederherstellen', 'Endgültig löschen'],
        };
        const allActions = ['Veröffentlichen', 'Privat schalten', 'Ablauf ändern', 'Archivieren', 'Aus Archiv wiederherstellen', 'Wieder öffnen', 'Löschen', 'Wiederherstellen', 'Endgültig löschen'];
        const cards = Array.from(rendered.container.querySelectorAll<HTMLElement>('.poll-admin-list > .poll-admin-card'));
        expect(cards).toHaveLength(6);
        expect(within(cards[0]).getByText('Current yes')).toBeVisible();
        expect(within(cards[0]).queryByText(/Snapshot description/)).toBeNull();
        expect(within(cards[0]).queryByText('Snapshot yes')).toBeNull();
        for (const card of cards) {
            const title = within(card).getByRole('heading', {level: 2}).textContent ?? '';
            for (const action of allActions) {
                if (expectedActions[title].includes(action)) expect(within(card).getByRole('button', {name: action})).toBeVisible();
                else expect(within(card).queryByRole('button', {name: action})).toBeNull();
            }
        }
        expect(within(cards[0]).getByRole('button', {name: 'Optionen ersetzen'})).toBeVisible();
        expect(within(cards[2]).queryByRole('button', {name: 'Privat schalten'})).toBeNull();
        expect(within(cards[3]).getByRole('button', {name: 'Wieder öffnen'})).toBeDisabled();
    });

    it('only allows draft option replacement and publishes only with a future expiry', async () => {
        mockSession(adminSession());
        vi.spyOn(apiClient, 'getAdminPolls').mockResolvedValue([testPoll('draft')]);
        const replacePollOptions = vi.spyOn(apiClient, 'replacePollOptions').mockResolvedValue(testPoll('draft'));
        const publishPoll = vi.spyOn(apiClient, 'publishPoll').mockResolvedValue(testPoll('active'));

        renderAdmin('/admin/polls');

        const card = await openPoll('draft poll');
        expect(card).not.toBeNull();
        const scoped = within(card as HTMLElement);
        expect(scoped.getByRole('button', {name: 'Veröffentlichen'})).toBeEnabled();
        fireEvent.click(scoped.getByRole('button', {name: 'Veröffentlichen'}));
        expect(publishPoll).not.toHaveBeenCalled();
        expect(scoped.getByLabelText('Veröffentlichen')).toHaveAttribute('aria-invalid', 'true');
        expect(scoped.getByLabelText('Veröffentlichen')).toHaveAccessibleDescription(/Zukunft/);
        fireEvent.change(scoped.getByLabelText('Veröffentlichen'), {target: {value: '2099-01-01T12:00'}});
        expect(scoped.getByLabelText('Veröffentlichen')).not.toHaveAttribute('aria-invalid', 'true');
        fireEvent.click(scoped.getByRole('button', {name: 'Optionen ersetzen'}));
        fireEvent.change(scoped.getByLabelText('Optionen, eine pro Zeile'), {target: {value: 'First\nSecond'}});
        fireEvent.click(scoped.getByRole('button', {name: 'Speichern'}));
        await waitFor(() => expect(replacePollOptions).toHaveBeenCalledWith('p_v1_draft_private', ['First', 'Second']));
        fireEvent.click(scoped.getByRole('button', {name: 'Veröffentlichen'}));
        await waitFor(() => expect(publishPoll).toHaveBeenCalledWith('p_v1_draft_private', new Date('2099-01-01T12:00').toISOString()));
    });

    it('keeps option values after replacing options fails', async () => {
        mockSession(adminSession());
        vi.spyOn(apiClient, 'getAdminPolls').mockResolvedValue([testPoll('draft')]);
        vi.spyOn(apiClient, 'replacePollOptions').mockRejectedValue(problemError({status: 409, code: 'poll_state_conflict'}, 409));

        renderAdmin('/admin/polls');

        const card = await openPoll('draft poll');
        const scoped = within(card as HTMLElement);
        fireEvent.click(scoped.getByRole('button', {name: 'Optionen ersetzen'}));
        const options = scoped.getByLabelText('Optionen, eine pro Zeile');
        fireEvent.change(options, {target: {value: 'First\nSecond'}});
        fireEvent.click(scoped.getByRole('button', {name: 'Speichern'}));

        expect(await scoped.findByRole('alert')).toHaveTextContent('Der aktuelle Zustand erlaubt diese Aktion nicht.');
        expect(options).toHaveValue('First\nSecond');
    });

    it('keeps the expiry value after changing it fails', async () => {
        mockSession(adminSession());
        vi.spyOn(apiClient, 'getAdminPolls').mockResolvedValue([testPoll('expired')]);
        vi.spyOn(apiClient, 'changePollExpiry').mockRejectedValue(problemError({status: 409, code: 'poll_state_conflict'}, 409));

        renderAdmin('/admin/polls');

        const card = await openPoll('expired poll');
        const scoped = within(card as HTMLElement);
        const expiry = scoped.getByLabelText('Ablauf ändern');
        fireEvent.change(expiry, {target: {value: '2099-01-01T12:00'}});
        fireEvent.click(scoped.getByRole('button', {name: 'Ablauf ändern'}));

        expect(await scoped.findByRole('alert')).toHaveTextContent('Der aktuelle Zustand erlaubt diese Aktion nicht.');
        expect(expiry).toHaveValue('2099-01-01T12:00');
    });

    it('executes the remaining allowed lifecycle actions', async () => {
        mockSession(adminSession());
        const makePrivate = vi.spyOn(apiClient, 'makePollPrivate').mockResolvedValue(testPoll('active', 'private'));
        const changedExpiryPoll = {...testPoll('expired'), endsAt: new Date('2099-02-01T12:00').toISOString()};
        const changeExpiry = vi.spyOn(apiClient, 'changePollExpiry').mockResolvedValue(changedExpiryPoll);
        const reopen = vi.spyOn(apiClient, 'reopenPoll').mockResolvedValue(testPoll('active'));
        const restore = vi.spyOn(apiClient, 'restorePoll').mockResolvedValue(testPoll('archived'));

        vi.spyOn(apiClient, 'getAdminPolls').mockResolvedValue([testPoll('active')]);
        const active = renderAdmin('/admin/polls');
        let card = await openPoll('active public poll');
        fireEvent.click(within(card).getByRole('button', {name: 'Privat schalten'}));
        await waitFor(() => expect(makePrivate).toHaveBeenCalledWith('p_v1_active_public'));
        active.unmount();
        queryClient.clear();

        const expiredPoll = {...testPoll('expired'), endsAt: '2099-01-01T00:00:00.000Z'};
        vi.spyOn(apiClient, 'getAdminPolls').mockResolvedValue([expiredPoll]);
        renderAdmin('/admin/polls');
        card = await openPoll('expired poll');
        fireEvent.change(within(card).getByLabelText('Ablauf ändern'), {target: {value: '2099-02-01T12:00'}});
        fireEvent.click(within(card).getByRole('button', {name: 'Ablauf ändern'}));
        await waitFor(() => expect(changeExpiry).toHaveBeenCalledWith('p_v1_expired_private', new Date('2099-02-01T12:00').toISOString()));
        fireEvent.click(within(card).getByRole('button', {name: 'Wieder öffnen'}));
        await waitFor(() => expect(reopen).toHaveBeenCalledWith('p_v1_expired_private'));

        cleanup();
        queryClient.clear();
        vi.spyOn(apiClient, 'getAdminPolls').mockResolvedValue([testPoll('deleted')]);
        renderAdmin('/admin/polls');
        card = await openPoll('deleted poll');
        fireEvent.click(within(card).getByRole('button', {name: 'Wiederherstellen'}));
        await waitFor(() => expect(restore).toHaveBeenCalledWith('p_v1_deleted_private'));
    });

    it('offers only non-empty template groups for poll creation', async () => {
        mockSession(adminSession());
        vi.spyOn(apiClient, 'getAdminPolls').mockResolvedValue([]);
        vi.spyOn(apiClient, 'getGroups').mockResolvedValue([
            {id: 'g_v1_empty', name: 'Empty', description: ''},
            {id: 'g_v1_full', name: 'Full', description: ''},
        ]);
        vi.spyOn(apiClient, 'getTemplatesInGroup').mockImplementation(async (groupId) => {
            if (groupId === 'g_v1_full') return [{id: 't_v1_one', name: 'One'}];
            return [];
        });

        renderAdmin('/admin/polls');
        fireEvent.click(await screen.findByRole('button', {name: 'Neue Abstimmung'}));

        const select = await screen.findByLabelText('Vorlagengruppe');
        expect(within(select).queryByRole('option', {name: 'Empty'})).toBeNull();
        expect(within(select).getByRole('option', {name: 'Full'})).toBeVisible();
        expect(screen.getByRole('button', {name: 'Speichern'})).toBeEnabled();
    });

    it('shows the translated members group name when creating a poll', async () => {
        mockSession(adminSession());
        vi.spyOn(apiClient, 'getAdminPolls').mockResolvedValue([]);
        vi.spyOn(apiClient, 'getGroups').mockResolvedValue([{id: 'g_v1_members', name: 'Stored name', description: '', kind: 'members'}]);
        vi.spyOn(apiClient, 'getTemplatesInGroup').mockResolvedValue([{id: 't_v1_anna', name: 'Anna', managed: true}]);

        renderAdmin('/admin/polls');
        fireEvent.click(await screen.findByRole('button', {name: 'Neue Abstimmung'}));

        const select = await screen.findByLabelText('Vorlagengruppe');
        expect(await within(select).findByRole('option', {name: 'Alle Mitglieder'})).toBeVisible();
        expect(within(select).queryByRole('option', {name: 'Stored name'})).toBeNull();
    });

    it('keeps poll creation values after the server rejects the snapshot', async () => {
        mockSession(adminSession());
        vi.spyOn(apiClient, 'getAdminPolls').mockResolvedValue([]);
        vi.spyOn(apiClient, 'getGroups').mockResolvedValue([{id: 'g_v1_full', name: 'Full', description: ''}]);
        vi.spyOn(apiClient, 'getTemplatesInGroup').mockResolvedValue([{id: 't_v1_one', name: 'One'}]);
        vi.spyOn(apiClient, 'createPoll').mockRejectedValue(problemError({status: 409, code: 'poll_state_conflict'}, 409));

        renderAdmin('/admin/polls');
        fireEvent.click(await screen.findByRole('button', {name: 'Neue Abstimmung'}));

        const title = await screen.findByLabelText('Abstimmungs-Titel');
        const group = screen.getByLabelText('Vorlagengruppe');
        fireEvent.change(title, {target: {value: 'A corrected title'}});
        fireEvent.change(group, {target: {value: 'g_v1_full'}});
        fireEvent.click(screen.getByRole('button', {name: 'Speichern'}));

        expect(await screen.findByRole('alert')).toHaveTextContent('Der aktuelle Zustand erlaubt diese Aktion nicht.');
        expect(title).toHaveValue('A corrected title');
        expect(group).toHaveValue('g_v1_full');
    });

    it('creates a draft with the selected template-group options', async () => {
        mockSession(adminSession());
        vi.spyOn(apiClient, 'getGroups').mockResolvedValue([{id: 'g_v1_full', name: 'Full', description: ''}]);
        vi.spyOn(apiClient, 'getTemplatesInGroup').mockResolvedValue([{id: 't_v1_one', name: 'One'}]);
        const created = testPoll('draft');
        created.title = 'Created draft';
        const createPoll = vi.spyOn(apiClient, 'createPoll').mockResolvedValue(created);
        vi.spyOn(apiClient, 'getAdminPolls').mockResolvedValue([created]);

        renderAdmin('/admin/polls');
        fireEvent.click(await screen.findByRole('button', {name: 'Neue Abstimmung'}));

        fireEvent.change(await screen.findByLabelText('Abstimmungs-Titel'), {target: {value: 'Created draft'}});
        fireEvent.change(screen.getByLabelText('Vorlagengruppe'), {target: {value: 'g_v1_full'}});
        fireEvent.click(screen.getByRole('button', {name: 'Speichern'}));

        await waitFor(() => expect(createPoll).toHaveBeenCalledWith({title: 'Created draft', templateGroupId: 'g_v1_full'}));
        expect(await screen.findByRole('button', {name: 'Created draft', expanded: true})).toBeVisible();
        expect(screen.queryByRole('heading', {name: 'Neue Abstimmung'})).toBeNull();
        expect(screen.getByText('Current yes')).toBeVisible();
        expect(screen.queryByText('Snapshot yes')).toBeNull();
    });

    it('requires one confirmation for soft delete and two for permanent delete', async () => {
        mockSession(adminSession());
        vi.spyOn(apiClient, 'getAdminPolls').mockResolvedValue([testPoll('active'), testPoll('deleted')]);
        const deletePoll = vi.spyOn(apiClient, 'deletePoll').mockResolvedValue(testPoll('deleted'));
        const permanentlyDeletePoll = vi.spyOn(apiClient, 'permanentlyDeletePoll').mockResolvedValue(undefined);
        const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

        const rendered = renderAdmin('/admin/polls');

        fireEvent.click(await screen.findByRole('button', {name: 'active public poll'}));
        fireEvent.click(screen.getByRole('button', {name: 'deleted poll'}));
        const cards = Array.from(rendered.container.querySelectorAll<HTMLElement>('.poll-admin-list > .poll-admin-card'));
        fireEvent.click(within(cards[0]).getByRole('button', {name: 'Löschen'}));
        fireEvent.click(within(cards[1]).getByRole('button', {name: 'Endgültig löschen'}));
        await waitFor(() => expect(deletePoll).toHaveBeenCalledWith('p_v1_active_public'));
        await waitFor(() => expect(permanentlyDeletePoll).toHaveBeenCalledWith('p_v1_deleted_private'));
        expect(confirm).toHaveBeenCalledTimes(3);
        expect(confirm).toHaveBeenNthCalledWith(1, 'Abstimmung „active public poll“ löschen? Sie kann wiederhergestellt werden.');
        expect(confirm).toHaveBeenNthCalledWith(2, 'Abstimmung „deleted poll“ endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden.');
        expect(confirm).toHaveBeenNthCalledWith(3, 'Bitte dauerhaftes Löschen ein zweites Mal bestätigen.');
    });

    it('places dangerous actions last in their own group and cancels without a request (spec 009, US5)', async () => {
        mockSession(adminSession());
        vi.spyOn(apiClient, 'getAdminPolls').mockResolvedValue([testPoll('expired')]);
        const deletePoll = vi.spyOn(apiClient, 'deletePoll');
        vi.spyOn(window, 'confirm').mockReturnValue(false);

        renderAdmin('/admin/polls');

        const row = await openPoll('expired poll');
        const actions = row.querySelector('.poll-admin-actions') as HTMLElement;
        const danger = actions.lastElementChild as HTMLElement;
        expect(danger).toHaveClass('action-group-danger');
        expect(within(danger).getByRole('button', {name: 'Löschen'})).toBeVisible();
        expect(within(danger).queryByRole('button', {name: 'Archivieren'})).toBeNull();
        fireEvent.click(within(danger).getByRole('button', {name: 'Löschen'}));
        expect(deletePoll).not.toHaveBeenCalled();
    });

    it('names the group and says that deleting it cannot be undone', async () => {
        mockSession(adminSession());
        vi.spyOn(apiClient, 'getGroups').mockResolvedValue([{id: 'g_v1_board', name: 'Board', description: ''}]);
        vi.spyOn(apiClient, 'getTemplates').mockResolvedValue([]);
        vi.spyOn(apiClient, 'getTemplatesInGroup').mockResolvedValue([]);
        const deleteGroup = vi.spyOn(apiClient, 'deleteGroup');
        const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);

        renderAdmin('/admin/groups');
        await findAdminPanel();

        const button = await screen.findByRole('button', {name: 'Löschen'});
        expect(button.closest('.action-group-danger')).not.toBeNull();
        fireEvent.click(button);
        expect(confirm).toHaveBeenCalledWith('Vorlagengruppe „Board“ löschen? Diese Aktion kann nicht rückgängig gemacht werden.');
        expect(deleteGroup).not.toHaveBeenCalled();
    });
});

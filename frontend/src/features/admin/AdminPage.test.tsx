import '@testing-library/jest-dom/vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient, sessionCoordinator } from '../../shared/api/client';
import { networkError, problemError } from '../../shared/api/errors';
import { queryClient } from '../../shared/api/queryClient';
import { queryKeys } from '../../shared/api/queryKeys';
import { I18nProvider } from '../../shared/i18n/I18nProvider';
import { AdminPage } from './AdminPage';

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
          <AdminPage />
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
    const getAdminVotes = vi.spyOn(apiClient, 'getAdminVotes').mockResolvedValue({ votes: [], page: 0, size: 50, totalElements: 0 });
    const getAdminPolls = vi.spyOn(apiClient, 'getAdminPolls').mockResolvedValue([]);
    const getGroups = vi.spyOn(apiClient, 'getGroups').mockResolvedValue([]);
    const getTemplates = vi.spyOn(apiClient, 'getTemplates').mockResolvedValue([]);

    renderAdmin('/admin/votes');

    expect(await screen.findByRole('heading', { name: 'Stimmen', level: 3 })).toBeVisible();
    expect(screen.getAllByRole('link')).toHaveLength(5);
    expect(screen.getByRole('link', { name: 'Stimmen' })).toHaveAttribute('aria-current', 'page');
    expect(getAdminSession).toHaveBeenCalledTimes(1);
    expect(getAdminVotes).toHaveBeenCalledTimes(1);
    expect(getAdminPolls).not.toHaveBeenCalled();
    expect(getGroups).not.toHaveBeenCalled();
    expect(getTemplates).not.toHaveBeenCalled();
  });

  it.each([
    ['bad request', problemError({ status: 400, code: 'invalid_credentials' }, 400), 'Die Anfrage konnte nicht verarbeitet werden.'],
    ['bad credentials', problemError({ status: 401, code: 'unauthorized' }, 401), 'Die Anmeldung ist abgelaufen.'],
    ['csrf failure', problemError({ status: 403, code: 'csrf_invalid' }, 403), 'Diese Aktion ist nicht erlaubt.'],
    ['network failure', networkError(new Error('offline')), 'Netzwerkfehler. Prüfe deine Verbindung.'],
  ])('keeps credentials transient after %s', async (_description, error, message) => {
    vi.spyOn(apiClient, 'getAdminSession').mockRejectedValue(problemError({ status: 401, code: 'unauthorized' }, 401));
    vi.spyOn(apiClient, 'login').mockRejectedValue(error);

    renderAdmin();

    const username = await screen.findByLabelText('Benutzername');
    fireEvent.change(username, { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText('Passwort'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }));

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

    fireEvent.change(await screen.findByLabelText('Benutzername'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText('Passwort'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }));

    expect(await screen.findByRole('heading', { name: 'Polls', level: 3 })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Polls' })).toHaveAttribute('aria-current', 'page');
  });

  it('removes protected content and shows login when the visible area expires', async () => {
    const unauthorized = problemError({ status: 401, code: 'unauthorized' }, 401);
    vi.spyOn(apiClient, 'getAdminSession').mockResolvedValue(undefined);
    vi.spyOn(apiClient, 'getAdminVotes').mockImplementation(async () => {
      sessionCoordinator.requireLogin('/admin/votes');
      throw unauthorized;
    });

    renderAdmin('/admin/votes');

    expect(await screen.findByLabelText('Benutzername')).toBeVisible();
    expect(screen.queryByRole('tab')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Stimmen', level: 3 })).toBeNull();
  });

  it('logs out and removes the protected query cache before returning to login', async () => {
    vi.spyOn(apiClient, 'getAdminSession').mockResolvedValue(undefined);
    vi.spyOn(apiClient, 'getAdminVotes').mockResolvedValue({ votes: [], page: 0, size: 50, totalElements: 0 });
    vi.spyOn(apiClient, 'logout').mockImplementation(async () => {
      queryClient.removeQueries({ queryKey: queryKeys.adminSession });
      sessionCoordinator.requireLogin('/admin');
    });
    queryClient.setQueryData(queryKeys.adminPolls, [{ id: 'private-poll' }]);

    renderAdmin('/admin/votes');

    await screen.findByRole('heading', { name: 'Stimmen', level: 3 });
    fireEvent.click(screen.getByRole('button', { name: 'Abmelden' }));

    expect(await screen.findByLabelText('Benutzername')).toBeVisible();
    expect(queryClient.getQueryData(queryKeys.adminPolls)).toBeUndefined();
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Stimmen' })).toBeNull());
  });

  it('searches templates and paginates in pages of twenty', async () => {
    vi.spyOn(apiClient, 'getAdminSession').mockResolvedValue(undefined);
    vi.spyOn(apiClient, 'getTemplates').mockResolvedValue(Array.from({ length: 21 }, (_, index) => ({ id: `t_v1_${index + 1}`, name: `Template ${index + 1}` })));

    renderAdmin('/admin/templates');

    expect(await screen.findByRole('heading', { name: 'Optionsvorlagen', level: 3 })).toBeVisible();
    expect(screen.getAllByRole('listitem')).toHaveLength(20);
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));
    expect(screen.getByText('Template 21')).toBeVisible();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    fireEvent.change(screen.getByLabelText('Vorlagen suchen'), { target: { value: 'Template 2' } });
    expect(screen.getByText('Template 2')).toBeVisible();
    expect(screen.getByText('Template 20')).toBeVisible();
  });

  it('normalizes batch values, skips duplicates, and reports partial failures', async () => {
    vi.spyOn(apiClient, 'getAdminSession').mockResolvedValue(undefined);
    vi.spyOn(apiClient, 'getTemplates').mockResolvedValue([{ id: 't_v1_existing', name: 'alpha' }]);
    const createTemplate = vi.spyOn(apiClient, 'createTemplate').mockImplementation(async (name) => {
      if (name === 'beta') throw problemError({ status: 409, code: 'conflict' }, 409);
      return { id: 't_v1_gamma', name };
    });

    renderAdmin('/admin/templates');

    await screen.findByRole('heading', { name: 'Optionsvorlagen', level: 3 });
    fireEvent.change(screen.getByLabelText('Mehrere Vorlagen (kommagetrennt)'), { target: { value: ' Alpha, , Beta, beta, Gamma ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Importieren' }));

    expect(await screen.findByText('Import-Ergebnis')).toBeVisible();
    expect(createTemplate.mock.calls.map(([name]) => name).sort()).toEqual(['beta', 'gamma']);
    expect(screen.getByRole('status')).toHaveTextContent('Erstellt: 1');
    expect(screen.getByRole('status')).toHaveTextContent('gamma');
    expect(screen.getByRole('status')).toHaveTextContent('Übersprungen: 3');
    expect(screen.getByRole('status')).toHaveTextContent('alpha');
    expect(screen.getByRole('status')).toHaveTextContent('Leerer Wert');
    expect(screen.getByRole('status')).toHaveTextContent('Fehlgeschlagen: 1');
  });

  it('limits concurrent batch requests', async () => {
    vi.spyOn(apiClient, 'getAdminSession').mockResolvedValue(undefined);
    vi.spyOn(apiClient, 'getTemplates').mockResolvedValue([]);
    let maxActive = 0;
    let active = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const createTemplate = vi.spyOn(apiClient, 'createTemplate').mockImplementation(async (name) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await gate;
      active -= 1;
      return { id: `t_v1_${name}`, name };
    });

    renderAdmin('/admin/templates');

    await screen.findByRole('heading', { name: 'Optionsvorlagen', level: 3 });
    fireEvent.change(screen.getByLabelText('Mehrere Vorlagen (kommagetrennt)'), { target: { value: 'one, two, three, four, five' } });
    fireEvent.click(screen.getByRole('button', { name: 'Importieren' }));
    await waitFor(() => expect(createTemplate).toHaveBeenCalledTimes(3));
    expect(maxActive).toBe(3);
    release();
    expect(await screen.findByText('Import-Ergebnis')).toBeVisible();
  });

  it('creates and renames an individual option template', async () => {
    vi.spyOn(apiClient, 'getAdminSession').mockResolvedValue(undefined);
    vi.spyOn(apiClient, 'getTemplates').mockResolvedValue([{ id: 't_v1_existing', name: 'alpha' }]);
    const createTemplate = vi.spyOn(apiClient, 'createTemplate').mockResolvedValue({ id: 't_v1_new', name: 'new template' });
    const renameTemplate = vi.spyOn(apiClient, 'renameTemplate').mockResolvedValue({ id: 't_v1_existing', name: 'renamed' });

    renderAdmin('/admin/templates');

    await screen.findByRole('heading', { name: 'Optionsvorlagen', level: 3 });
    fireEvent.change(screen.getByLabelText('Neue Optionsvorlage'), { target: { value: ' New Template ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Vorlage anlegen' }));
    await waitFor(() => expect(createTemplate).toHaveBeenCalledWith('new template'));
    fireEvent.click(screen.getByRole('button', { name: 'Umbenennen' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Vorlage umbenennen alpha' }), { target: { value: 'Renamed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));
    await waitFor(() => expect(renameTemplate).toHaveBeenCalledWith('t_v1_existing', 'renamed'));
  });

  it('requires confirmation for global template deletion', async () => {
    vi.spyOn(apiClient, 'getAdminSession').mockResolvedValue(undefined);
    vi.spyOn(apiClient, 'getTemplates').mockResolvedValue([{ id: 't_v1_existing', name: 'alpha' }]);
    const deleteTemplate = vi.spyOn(apiClient, 'deleteTemplate').mockResolvedValue(undefined);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);

    renderAdmin('/admin/templates');

    await screen.findByRole('heading', { name: 'Optionsvorlagen', level: 3 });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Vorlage auswählen alpha' }));
    fireEvent.click(screen.getByRole('button', { name: /Ausgewählte löschen/ }));

    expect(confirm).toHaveBeenCalled();
    expect(deleteTemplate).not.toHaveBeenCalled();
  });

  it('reports partial results when deleting multiple templates', async () => {
    vi.spyOn(apiClient, 'getAdminSession').mockResolvedValue(undefined);
    vi.spyOn(apiClient, 'getTemplates').mockResolvedValue([{ id: 't_v1_one', name: 'One' }, { id: 't_v1_two', name: 'Two' }]);
    const deleteTemplate = vi.spyOn(apiClient, 'deleteTemplate').mockImplementation(async (id) => {
      if (id === 't_v1_two') throw problemError({ status: 409, code: 'conflict' }, 409);
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderAdmin('/admin/templates');

    await screen.findByRole('heading', { name: 'Optionsvorlagen', level: 3 });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Sichtbare auswählen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ausgewählte löschen (2)' }));

    expect(await screen.findByText('Lösch-Ergebnis')).toBeVisible();
    expect(deleteTemplate).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('status')).toHaveTextContent('Gelöscht: 1');
    expect(screen.getByRole('status')).toHaveTextContent('Fehlgeschlagen: 1');
    expect(screen.getByRole('status')).toHaveTextContent('Two');
  });

  it('adds and removes memberships without deleting the global template', async () => {
    vi.spyOn(apiClient, 'getAdminSession').mockResolvedValue(undefined);
    vi.spyOn(apiClient, 'getGroups').mockResolvedValue([{ id: 'g_v1_group', name: 'Board', description: 'A board' }]);
    vi.spyOn(apiClient, 'getTemplates').mockResolvedValue([{ id: 't_v1_one', name: 'One' }, { id: 't_v1_two', name: 'Two' }]);
    vi.spyOn(apiClient, 'getTemplatesInGroup').mockResolvedValue([{ id: 't_v1_one', name: 'One' }]);
    const assign = vi.spyOn(apiClient, 'assignTemplateToGroup').mockResolvedValue(undefined);
    const remove = vi.spyOn(apiClient, 'removeTemplateFromGroup').mockResolvedValue(undefined);
    const deleteTemplate = vi.spyOn(apiClient, 'deleteTemplate').mockResolvedValue(undefined);

    renderAdmin('/admin/groups');

    expect(await screen.findByRole('heading', { name: 'Vorlagengruppen', level: 3 })).toBeVisible();
    expect(await screen.findByText('One')).toBeVisible();
    fireEvent.change(screen.getByLabelText('Vorlage hinzufügen'), { target: { value: 't_v1_two' } });
    fireEvent.click(screen.getByRole('button', { name: 'Hinzufügen' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('g_v1_group', 't_v1_two'));
    fireEvent.click(screen.getByRole('button', { name: 'Mitgliedschaft entfernen' }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith('g_v1_group', 't_v1_one'));
    expect(deleteTemplate).not.toHaveBeenCalled();
  });

  it('creates, renames, and deletes a template group explicitly', async () => {
    vi.spyOn(apiClient, 'getAdminSession').mockResolvedValue(undefined);
    const groups = [{ id: 'g_v1_group', name: 'Board', description: 'A board' }];
    vi.spyOn(apiClient, 'getGroups').mockImplementation(async () => groups);
    vi.spyOn(apiClient, 'getTemplates').mockResolvedValue([]);
    const createGroup = vi.spyOn(apiClient, 'createGroup').mockImplementation(async ({ name, description }) => {
      const created = { id: 'g_v1_new', name, description };
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

    await screen.findByRole('heading', { name: 'Vorlagengruppen', level: 3 });
    fireEvent.change(screen.getByLabelText('Neue Vorlagengruppe'), { target: { value: 'New Board' } });
    fireEvent.change(screen.getByLabelText('Beschreibung'), { target: { value: 'New description' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gruppe anlegen' }));
    await waitFor(() => expect(createGroup).toHaveBeenCalledWith({ name: 'new board', description: 'New description' }));
    fireEvent.change(screen.getByLabelText('Gruppe umbenennen'), { target: { value: 'Renamed Board' } });
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));
    await waitFor(() => expect(renameGroup).toHaveBeenCalledWith('g_v1_new', 'renamed board'));
    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }));
    await waitFor(() => expect(deleteGroup).toHaveBeenCalledWith('g_v1_new'));
  });
});

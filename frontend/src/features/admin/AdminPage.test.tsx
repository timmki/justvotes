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
});

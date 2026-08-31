import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClient, sessionCoordinator } from './client';
import { ApiError } from './errors';
import { queryKeys } from './queryKeys';
import { queryClient } from './queryClient';
import { SessionCoordinator } from './session';

afterEach(() => { vi.restoreAllMocks(); queryClient.clear(); if (sessionCoordinator.isLoginRequired()) sessionCoordinator.consumeReturnRoute(); });

function jsonResponse(status: number, body: unknown, contentType = 'application/json') {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': contentType } });
}

describe('ApiClient', () => {
  it('uses the relative API prefix and same-origin credentials', async () => {
    const fetcher = vi.fn(async () => jsonResponse(200, { userID: null }));
    const client = new ApiClient({ fetcher });

    await client.getIdentity();

    expect(fetcher).toHaveBeenCalledWith('/api/v1/identity', expect.objectContaining({ credentials: 'same-origin' }));
  });

  it('bootstraps CSRF once, attaches the returned header, and refreshes after login', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(jsonResponse(200, { token: 'first-token', headerName: 'X-XSRF-TOKEN' }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(jsonResponse(200, { token: 'second-token', headerName: 'X-XSRF-TOKEN' }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const client = new ApiClient({ fetcher });

    await client.login({ username: 'admin', password: 'secret' });
    await client.changeIdentity({ userID: 'alice' });

    const loginRequest = fetcher.mock.calls[1][1] as RequestInit;
    const identityRequest = fetcher.mock.calls[3][1] as RequestInit;
    expect(fetcher.mock.calls[1][0]).toBe('/api/v1/admin/login');
    expect(loginRequest).toMatchObject({ credentials: 'same-origin', body: JSON.stringify({ username: 'admin', password: 'secret' }) });
    expect((loginRequest.headers as Headers).get('X-XSRF-TOKEN')).toBe('first-token');
    expect(fetcher.mock.calls[3][0]).toBe('/api/v1/identity');
    expect(identityRequest.credentials).toBe('same-origin');
    expect((identityRequest.headers as Headers).get('X-XSRF-TOKEN')).toBe('second-token');
  });

  it('normalizes Problem Details and network failures consistently', async () => {
    const problemClient = new ApiClient({ fetcher: vi.fn(async () => jsonResponse(409, { title: 'Conflict', status: 409, code: 'poll_state_conflict', detail: 'Not active.' }, 'application/problem+json')) });
    await expect(problemClient.getPublicPolls()).rejects.toMatchObject({ frontend: { kind: 'problem', status: 409, code: 'poll_state_conflict', retryable: false } });

    const networkClient = new ApiClient({ fetcher: vi.fn(async () => { throw new TypeError('offline'); }) });
    const result = await networkClient.getPublicPolls().catch((error: unknown) => error);
    expect(result).toBeInstanceOf(ApiError);
    expect((result as ApiError).frontend).toMatchObject({ kind: 'network', code: 'network_error', retryable: true });
  });

  it('clears protected query data and remembers the requested route after admin 401', async () => {
    const clientCache = new QueryClient();
    const session = new SessionCoordinator(clientCache);
    clientCache.setQueryData(queryKeys.adminPolls, [{ id: 'private-poll' }]);
    clientCache.setQueryData(queryKeys.publicPolls, [{ id: 'public-poll' }]);
    const client = new ApiClient({
      fetcher: vi.fn(async () => jsonResponse(401, { status: 401, code: 'unauthorized' }, 'application/problem+json')),
      onUnauthorized: () => session.requireLogin('/admin/polls'),
    });

    await expect(client.getAdminPolls()).rejects.toBeInstanceOf(ApiError);

    expect(clientCache.getQueryData(queryKeys.adminPolls)).toBeUndefined();
    expect(clientCache.getQueryData(queryKeys.publicPolls)).toEqual([{ id: 'public-poll' }]);
    expect(session.consumeReturnRoute()).toBe('/admin/polls');
    expect(session.isLoginRequired()).toBe(false);
  });

  it('uses the default session coordinator for an admin 401', async () => {
    queryClient.setQueryData(queryKeys.adminPolls, [{ id: 'private-poll' }]);
    const fetcher = vi.fn()
      .mockResolvedValueOnce(jsonResponse(401, { status: 401, code: 'unauthorized' }, 'application/problem+json'))
      .mockResolvedValueOnce(jsonResponse(200, { token: 'fresh-token', headerName: 'X-XSRF-TOKEN' }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(jsonResponse(200, { token: 'post-login-token', headerName: 'X-XSRF-TOKEN' }));
    const client = new ApiClient({ fetcher });

    await expect(client.getAdminPolls()).rejects.toBeInstanceOf(ApiError);
    await client.login({ username: 'admin', password: 'secret' });

    expect(queryClient.getQueryData(queryKeys.adminPolls)).toBeUndefined();
    expect(sessionCoordinator.isLoginRequired()).toBe(true);
    expect(fetcher.mock.calls[1][0]).toBe('/api/v1/csrf');
    sessionCoordinator.consumeReturnRoute();
  });

  it('preserves the first return route while login is required', () => {
    const session = new SessionCoordinator(new QueryClient());

    session.requireLogin('/admin/polls');
    session.requireLogin('/admin');

    expect(session.consumeReturnRoute()).toBe('/admin/polls');
  });

  it('uses separate endpoints for membership changes and global template deletion', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(jsonResponse(200, { token: 'catalog-token', headerName: 'X-XSRF-TOKEN' }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const client = new ApiClient({ fetcher });

    await client.assignTemplateToGroup('g_v1_group', 't_v1_template');
    await client.removeTemplateFromGroup('g_v1_group', 't_v1_template');
    await client.deleteTemplate('t_v1_template');

    expect(fetcher.mock.calls[1][0]).toBe('/api/v1/admin/template-catalog/groups/g_v1_group/templates/t_v1_template');
    expect((fetcher.mock.calls[1][1] as RequestInit).method).toBe('PUT');
    expect(fetcher.mock.calls[2][0]).toBe('/api/v1/admin/template-catalog/groups/g_v1_group/templates/t_v1_template');
    expect((fetcher.mock.calls[2][1] as RequestInit).method).toBe('DELETE');
    expect(fetcher.mock.calls[3][0]).toBe('/api/v1/admin/template-catalog/templates/t_v1_template');
    expect((fetcher.mock.calls[3][1] as RequestInit).method).toBe('DELETE');
  });
});

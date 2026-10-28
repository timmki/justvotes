import type {components, operations} from './generated/justvotes';
import {ApiError, networkError, problemError} from './errors';
import {clearProtectedQueries, queryClient} from './queryClient';
import {queryKeys} from './queryKeys';
import {SessionCoordinator} from './session';

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown };
type UnauthorizedHandler = (requestPath: string) => void;
type AuthenticatedHandler = () => void;
type SessionEndedHandler = () => void;
type PasswordChangeRequiredHandler = () => void;

const apiPrefix = '/api/v1';

type CsrfToken = components['schemas']['CsrfToken'];
type Login = components['schemas']['Login'];
export type CurrentSession = components['schemas']['CurrentSession'];
type PasswordChange = components['schemas']['PasswordChange'];
type InvitationPreview = components['schemas']['InvitationPreview'];
type InvitationAcceptance = components['schemas']['InvitationAcceptance'];
type InvitationRequest = components['schemas']['InvitationRequest'];
type InvitationSummary = components['schemas']['InvitationSummary'];
type AccountSummary = components['schemas']['AccountSummary'];
type OneTimePassword = components['schemas']['OneTimePassword'];
type Poll = components['schemas']['Poll'];
type PollResults = components['schemas']['PollResults'];
type AuditEntry = components['schemas']['AuditEntry'];
type Vote = components['schemas']['Vote'];
type AdminVotePage = components['schemas']['AdminVotePage'];
type Template = components['schemas']['Template'];
type TemplateGroup = components['schemas']['TemplateGroup'];
type CreatePoll = components['schemas']['CreatePoll'];

export class ApiClient {
    private csrf: CsrfToken | null = null;
    private csrfRequest: Promise<CsrfToken> | null = null;
    private readonly fetcher: Fetcher;
    private readonly onUnauthorized: UnauthorizedHandler;
    private readonly onAuthenticated: AuthenticatedHandler;
    private readonly onSessionEnded: SessionEndedHandler;
    private readonly onPasswordChangeRequired: PasswordChangeRequiredHandler;

    constructor(options: {
        fetcher?: Fetcher;
        onUnauthorized?: UnauthorizedHandler;
        onAuthenticated?: AuthenticatedHandler;
        onSessionEnded?: SessionEndedHandler;
        onPasswordChangeRequired?: PasswordChangeRequiredHandler;
    } = {}) {
        this.fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);
        this.onUnauthorized = options.onUnauthorized ?? defaultUnauthorized;
        this.onAuthenticated = options.onAuthenticated ?? (() => undefined);
        this.onSessionEnded = options.onSessionEnded ?? (() => undefined);
        this.onPasswordChangeRequired = options.onPasswordChangeRequired ?? (() => undefined);
    }

    async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
        const method = (options.method ?? 'GET').toUpperCase();
        const headers = new Headers(options.headers);
        let body: BodyInit | undefined;

        if (options.body !== undefined) {
            headers.set('Content-Type', 'application/json');
            body = JSON.stringify(options.body);
        }
        if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
            const csrf = await this.ensureCsrf();
            headers.set(csrf.headerName, csrf.token);
        }

        return this.send<T>(path, {
            ...options,
            method,
            headers,
            body
        }, notifiesUnauthorized(path));
    }

    getCsrf() {
        return this.refreshCsrf();
    }

    login(credentials: Login) {
        return this.request<CurrentSession>('/session/login', {method: 'POST', body: credentials}).then(async (session) => {
            await this.refreshCsrf();
            this.onAuthenticated();
            return session;
        });
    }

    logout() {
        return this.request<void>('/session/logout', {method: 'POST'}).then(async () => {
            await this.refreshCsrf();
            this.onSessionEnded();
        });
    }

    /**
     * The signed-in account, or null when there is no valid session.
     */
    async getSession(): Promise<CurrentSession | null> {
        try {
            return await this.request<CurrentSession>('/session', {cache: 'no-store'});
        } catch (error) {
            if (error instanceof ApiError && error.frontend.status === 401) return null;
            throw error;
        }
    }

    changePassword(change: PasswordChange) {
        return this.request<void>('/session/password', {method: 'PUT', body: change});
    }

    inspectInvitation(token: string) {
        return this.request<InvitationPreview>('/invitations/inspection', {method: 'POST', body: {token}});
    }

    acceptInvitation(acceptance: InvitationAcceptance) {
        return this.request<CurrentSession>('/invitations/acceptance', {method: 'POST', body: acceptance}).then(async (session) => {
            await this.refreshCsrf();
            this.onAuthenticated();
            return session;
        });
    }

    getCurrentIdentityVotes() {
        return this.request<components['schemas']['CurrentIdentityVotes']>('/identity/votes', {cache: 'no-store'});
    }

    getInvitations() {
        return this.request<InvitationSummary[]>('/admin/invitations');
    }

    createInvitation(invitation: InvitationRequest) {
        return this.request<InvitationSummary>('/admin/invitations', {method: 'POST', body: invitation});
    }

    resendInvitation(invitationId: string) {
        return this.request<InvitationSummary>(`/admin/invitations/${encodeURIComponent(invitationId)}/resend`, {method: 'POST'});
    }

    revokeInvitation(invitationId: string) {
        return this.request<void>(`/admin/invitations/${encodeURIComponent(invitationId)}`, {method: 'DELETE'});
    }

    getAccounts() {
        return this.request<AccountSummary[]>('/admin/accounts');
    }

    lockAccount(accountId: string) {
        return this.request<AccountSummary>(`/admin/accounts/${encodeURIComponent(accountId)}/lock`, {method: 'POST'});
    }

    unlockAccount(accountId: string) {
        return this.request<AccountSummary>(`/admin/accounts/${encodeURIComponent(accountId)}/unlock`, {method: 'POST'});
    }

    assignOneTimePassword(accountId: string) {
        return this.request<OneTimePassword>(`/admin/accounts/${encodeURIComponent(accountId)}/one-time-password`, {method: 'POST'});
    }

    getPublicPolls() {
        return this.request<Poll[]>('/polls');
    }

    getPoll(pollId: string) {
        return this.request<Poll>(`/polls/${encodeURIComponent(pollId)}`);
    }

    getPollResults(pollId: string) {
        return this.request<PollResults>(`/polls/${encodeURIComponent(pollId)}/results`);
    }

    getPollAudit(pollId: string) {
        return this.request<AuditEntry[]>(`/polls/${encodeURIComponent(pollId)}/audit`);
    }

    castVote(pollId: string, optionNumber: number) {
        return this.request<Vote>(`/polls/${encodeURIComponent(pollId)}/votes`, {method: 'POST', body: {optionNumber}});
    }

    withdrawVote(pollId: string) {
        return this.request<void>(`/polls/${encodeURIComponent(pollId)}/votes`, {method: 'DELETE'});
    }

    getAdminVotes(page = 0, size = 50) {
        return this.request<AdminVotePage>(`/admin/votes?page=${page}&size=${size}`);
    }

    removeAdminVote(voteId: string, reason: string) {
        return this.request<void>(`/admin/votes/${encodeURIComponent(voteId)}`, {method: 'DELETE', body: {reason}});
    }

    getAdminPolls() {
        return this.request<Poll[]>('/admin/polls');
    }

    createPoll(poll: CreatePoll) {
        return this.request<Poll>('/admin/polls', {method: 'POST', body: poll});
    }

    replacePollOptions(pollId: string, optionTexts: string[]) {
        return this.request<Poll>(`/admin/polls/${encodeURIComponent(pollId)}/options`, {
            method: 'PUT',
            body: {optionTexts}
        });
    }

    publishPoll(pollId: string, endsAt: string) {
        return this.request<Poll>(`/admin/polls/${encodeURIComponent(pollId)}/publication`, {
            method: 'PUT',
            body: {endsAt}
        });
    }

    makePollPrivate(pollId: string) {
        return this.request<Poll>(`/admin/polls/${encodeURIComponent(pollId)}/publication`, {method: 'DELETE'});
    }

    changePollExpiry(pollId: string, endsAt: string) {
        return this.request<Poll>(`/admin/polls/${encodeURIComponent(pollId)}/expiry`, {method: 'PUT', body: {endsAt}});
    }

    archivePoll(pollId: string) {
        return this.request<Poll>(`/admin/polls/${encodeURIComponent(pollId)}/archive`, {method: 'PUT'});
    }

    restorePollFromArchive(pollId: string) {
        return this.request<Poll>(`/admin/polls/${encodeURIComponent(pollId)}/restore-from-archive`, {method: 'PUT'});
    }

    reopenPoll(pollId: string) {
        return this.request<Poll>(`/admin/polls/${encodeURIComponent(pollId)}/reopen`, {method: 'PUT'});
    }

    deletePoll(pollId: string) {
        return this.request<Poll>(`/admin/polls/${encodeURIComponent(pollId)}`, {method: 'DELETE'});
    }

    restorePoll(pollId: string) {
        return this.request<Poll>(`/admin/polls/${encodeURIComponent(pollId)}/restore`, {method: 'PUT'});
    }

    permanentlyDeletePoll(pollId: string) {
        return this.request<void>(`/admin/polls/${encodeURIComponent(pollId)}/permanent-deletion`, {
            method: 'POST',
            body: {confirmation: 'DELETE'}
        });
    }

    getTemplates() {
        return this.request<Template[]>('/admin/template-catalog/templates');
    }

    createTemplate(name: string) {
        return this.request<Template>('/admin/template-catalog/templates', {method: 'POST', body: {name}});
    }

    renameTemplate(templateId: string, name: string) {
        return this.request<Template>(`/admin/template-catalog/templates/${encodeURIComponent(templateId)}`, {
            method: 'PATCH',
            body: {name}
        });
    }

    deleteTemplate(templateId: string) {
        return this.request<void>(`/admin/template-catalog/templates/${encodeURIComponent(templateId)}`, {method: 'DELETE'});
    }

    getGroups() {
        return this.request<TemplateGroup[]>('/admin/template-catalog/groups');
    }

    createGroup(group: { name: string; description: string }) {
        return this.request<TemplateGroup>('/admin/template-catalog/groups', {method: 'POST', body: group});
    }

    renameGroup(groupId: string, name: string) {
        return this.request<TemplateGroup>(`/admin/template-catalog/groups/${encodeURIComponent(groupId)}`, {
            method: 'PATCH',
            body: {name}
        });
    }

    deleteGroup(groupId: string) {
        return this.request<void>(`/admin/template-catalog/groups/${encodeURIComponent(groupId)}`, {method: 'DELETE'});
    }

    getTemplatesInGroup(groupId: string) {
        return this.request<Template[]>(`/admin/template-catalog/groups/${encodeURIComponent(groupId)}/templates`);
    }

    assignTemplateToGroup(groupId: string, templateId: string) {
        return this.request<void>(`/admin/template-catalog/groups/${encodeURIComponent(groupId)}/templates/${encodeURIComponent(templateId)}`, {method: 'PUT'});
    }

    removeTemplateFromGroup(groupId: string, templateId: string) {
        return this.request<void>(`/admin/template-catalog/groups/${encodeURIComponent(groupId)}/templates/${encodeURIComponent(templateId)}`, {method: 'DELETE'});
    }

    invalidateCsrf() {
        this.csrf = null;
        this.csrfRequest = null;
    }

    async refreshCsrf() {
        this.invalidateCsrf();
        return this.ensureCsrf();
    }

    private ensureCsrf() {
        if (this.csrf) return Promise.resolve(this.csrf);
        if (!this.csrfRequest) {
            this.csrfRequest = this.send<CsrfToken>('/csrf', {method: 'GET'}, false).finally(() => {
                this.csrfRequest = null;
            });
        }
        return this.csrfRequest.then((token) => {
            this.csrf = token;
            return token;
        });
    }

    private async send<T>(path: string, options: RequestInit, notifyUnauthorized: boolean): Promise<T> {
        let response: Response;
        try {
            let url = path;
            if (!path.startsWith(apiPrefix)) {
                if (!path.startsWith('/')) url = `/${path}`;
                url = `${apiPrefix}${url}`;
            }
            response = await this.fetcher(url, {...options, credentials: 'same-origin'});
        } catch (error) {
            throw networkError(error);
        }

        if (!response.ok) {
            const problem = await readProblem(response);
            if (response.status === 403 && problem.code === 'password-change-required') this.onPasswordChangeRequired();
            else if (response.status === 403) this.invalidateCsrf();
            if (response.status === 401 && notifyUnauthorized) this.onUnauthorized(path);
            throw problemError(problem, response.status, retryAfter(response));
        }
        if (response.status === 204) return undefined as T;
        const text = await response.text();
        if (text) return JSON.parse(text) as T;
        return undefined as T;
    }
}

function retryAfter(response: Response) {
    const header = response.headers?.get('Retry-After');
    if (!header) return null;
    const seconds = Number.parseInt(header, 10);
    if (Number.isNaN(seconds)) return null;
    return seconds;
}

async function readProblem(response: Response) {
    const text = await response.text();
    if (!text) return {};
    try {
        return JSON.parse(text) as Partial<components['schemas']['Problem']>;
    } catch {
        return {};
    }
}

export const sessionCoordinator = new SessionCoordinator();
export const apiClient = new ApiClient({
    onUnauthorized: (path) => {
        sessionCoordinator.requireLogin(window.location.pathname + window.location.search || path);
        queryClient.setQueryData(queryKeys.session, null);
    },
    onSessionEnded: () => {
        clearProtectedQueries();
        sessionCoordinator.markLoggedOut();
        queryClient.setQueryData(queryKeys.session, null);
    },
    onPasswordChangeRequired: () => {
        void queryClient.invalidateQueries({queryKey: queryKeys.session});
    },
});

/**
 * Login, the session probe and the invitation endpoints answer 401 as part of their normal flow;
 * every other 401 means the session ended and the login page must be shown.
 */
function notifiesUnauthorized(path: string) {
    return path !== '/session' && path !== '/session/login' && !path.startsWith('/invitations/');
}

export type ApiOperation = keyof operations;

function defaultUnauthorized(path: string) {
    const location = globalThis.location;
    sessionCoordinator.requireLogin(`${location?.pathname ?? ''}${location?.search ?? ''}` || path);
}

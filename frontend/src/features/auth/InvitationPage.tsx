import {type FormEvent, type ReactNode, useEffect, useId, useState} from 'react';
import {Link, Navigate} from 'react-router-dom';
import {apiClient} from '../../shared/api/client';
import {ApiError} from '../../shared/api/errors';
import {queryClient} from '../../shared/api/queryClient';
import {queryKeys} from '../../shared/api/queryKeys';
import {useApiQuery} from '../../shared/api/useApiQuery';
import {useI18n} from '../../shared/i18n/I18nProvider';
import type {TranslationKey} from '../../shared/i18n/translations';
import {PageFrame} from '../../shared/ui/PageFrame';
import {RouteState} from '../../shared/ui/RouteState';
import {formatTimestamp} from '../polls/pollFormatters';
import {MIN_PASSWORD_LENGTH, passwordLength} from './PasswordChangePage';
import {homeRoute, useSessionQuery} from './sessionQueries';

export const INVITATION_TOKEN_KEY = 'justvotes.invitationToken';

/**
 * Moves the token from the link fragment into tab-local storage and removes it from the address bar,
 * so it survives a sign-out but never stays visible in the URL or browser history.
 */
export function takeInvitationToken(): string | null {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const fromLink = hash.get('token');
    if (fromLink) {
        sessionStore()?.setItem(INVITATION_TOKEN_KEY, fromLink);
        window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
        return fromLink;
    }
    return sessionStore()?.getItem(INVITATION_TOKEN_KEY) ?? null;
}

export function forgetInvitationToken() {
    sessionStore()?.removeItem(INVITATION_TOKEN_KEY);
}

function sessionStore(): Storage | null {
    try {
        return window.sessionStorage;
    } catch {
        return null;
    }
}

export function InvitationPage() {
    const {t} = useI18n();
    const sessionQuery = useSessionQuery();
    const [token] = useState(takeInvitationToken);
    const session = sessionQuery.data;

    // Signed in without a pending invitation, e.g. right after accepting one: continue in the own area.
    if (session && !token) return <Navigate to={homeRoute(session)} replace/>;
    if (sessionQuery.isPending) return <InvitationFrame><RouteState status="loading"/></InvitationFrame>;
    if (session) return <InvitationFrame><SignedInNotice name={session.accountName}/></InvitationFrame>;
    if (!token) return <InvitationFrame><UnusableInvitation messageKey="auth.invitationMissing"/></InvitationFrame>;
    return <InvitationFrame><InvitationForm token={token} t={t}/></InvitationFrame>;
}

function InvitationFrame({children}: {children: ReactNode}) {
    const {t} = useI18n();
    return <PageFrame className="auth-page" title={t('auth.invitationTitle')} description={t('auth.invitationDescription')}>
        {children}
    </PageFrame>;
}

function SignedInNotice({name}: {name: string}) {
    const {t} = useI18n();
    const [pending, setPending] = useState(false);
    async function logout() {
        setPending(true);
        try {
            await apiClient.logout();
        } finally {
            setPending(false);
        }
    }
    let label = t('auth.logout');
    if (pending) label = t('auth.loggingOut');
    return <div className="login-form" role="status">
        <p>{t('auth.invitationSignedIn').replace('{name}', name)}</p>
        <button className="primary-button" type="button" onClick={logout} disabled={pending} aria-busy={pending}>{label}</button>
    </div>;
}

function UnusableInvitation({messageKey}: {messageKey: TranslationKey}) {
    const {t} = useI18n();
    useEffect(() => forgetInvitationToken(), []);
    return <RouteState status="empty" title={t('auth.invitationTitle')} text={t(messageKey)}
                       action={<Link className="primary-button" to="/login">{t('auth.toLogin')}</Link>}/>;
}

function InvitationForm({token, t}: {token: string; t: ReturnType<typeof useI18n>['t']}) {
    const {locale} = useI18n();
    const preview = useApiQuery(['invitation', token], () => apiClient.inspectInvitation(token));
    const [accountName, setAccountName] = useState('');
    const [identity, setIdentity] = useState('');
    const [password, setPassword] = useState('');
    const [repeatPassword, setRepeatPassword] = useState('');
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<TranslationKey | null>(null);
    const [unusable, setUnusable] = useState(false);
    const nameHintId = useId();
    const identityHintId = useId();
    const policyId = useId();
    const errorId = useId();

    if (preview.isPending) return <p className="poll-notice" role="status">{t('auth.invitationChecking')}</p>;
    if (unusable || (preview.isError && isUnusable(preview.error))) return <UnusableInvitation messageKey="auth.invitationUnusable"/>;
    if (preview.isError) {
        let frontend;
        if (preview.error instanceof ApiError) frontend = preview.error.frontend;
        return <RouteState status="error" error={frontend} onRetry={() => void preview.refetch()}/>;
    }

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (passwordLength(password) < MIN_PASSWORD_LENGTH) {
            setError('auth.passwordTooShort');
            return;
        }
        if (password !== repeatPassword) {
            setError('auth.passwordsDiffer');
            return;
        }
        setPending(true);
        setError(null);
        try {
            const session = await apiClient.acceptInvitation({token, username: accountName.trim(), userID: identity.trim(), password});
            forgetInvitationToken();
            queryClient.setQueryData(queryKeys.session, session);
        } catch (cause) {
            if (isUnusable(cause)) setUnusable(true);
            else setError(acceptanceError(cause));
        } finally {
            setPending(false);
        }
    }

    let submitLabel = t('auth.createAccount');
    if (pending) submitLabel = t('auth.creatingAccount');
    let describedBy: string | undefined;
    if (error) describedBy = errorId;
    return <form className="login-form" onSubmit={submit} noValidate aria-describedby={describedBy}>
        <p>{t('auth.invitationFor')} <strong>{preview.data.email}</strong> · {t('auth.invitationValidUntil')} <time
            dateTime={preview.data.expiresAt}>{formatTimestamp(preview.data.expiresAt, locale)}</time></p>
        <label htmlFor="invitation-account-name">{t('auth.accountName')}</label>
        <input id="invitation-account-name" autoComplete="username" required maxLength={32} value={accountName}
               aria-describedby={nameHintId} aria-invalid={error === 'auth.accountNameTaken'}
               onChange={(event) => setAccountName(event.target.value)}/>
        <p id={nameHintId} className="form-hint">{t('auth.accountNameHint')}</p>
        <label htmlFor="invitation-identity">{t('auth.identity')}</label>
        <input id="invitation-identity" required value={identity} aria-describedby={identityHintId}
               aria-invalid={error === 'auth.identityTaken'} onChange={(event) => setIdentity(event.target.value)}/>
        <p id={identityHintId} className="form-hint">{t('auth.identityHint')}</p>
        <label htmlFor="invitation-password">{t('auth.newPassword')}</label>
        <input id="invitation-password" type="password" autoComplete="new-password" required value={password}
               aria-describedby={policyId} onChange={(event) => setPassword(event.target.value)}/>
        <p id={policyId} className="form-hint">{t('auth.passwordPolicy')}</p>
        <label htmlFor="invitation-repeat">{t('auth.repeatPassword')}</label>
        <input id="invitation-repeat" type="password" autoComplete="new-password" required value={repeatPassword}
               aria-invalid={error === 'auth.passwordsDiffer'} onChange={(event) => setRepeatPassword(event.target.value)}/>
        <button className="primary-button" type="submit" aria-busy={pending}
                disabled={pending || !accountName.trim() || !identity.trim() || !password || !repeatPassword}>
            {pending && <span className="button-spinner" aria-hidden="true"/>}{submitLabel}
        </button>
        <p id={errorId} className="form-error" role="alert">{error && t(error)}</p>
    </form>;
}

function isUnusable(cause: unknown) {
    return cause instanceof ApiError && cause.frontend.code === 'invitation-not-usable';
}

function acceptanceError(cause: unknown): TranslationKey {
    if (!(cause instanceof ApiError)) return 'errors.generic';
    if (cause.frontend.code === 'account-name-taken') return 'auth.accountNameTaken';
    if (cause.frontend.code === 'identity-taken') return 'auth.identityTaken';
    if (cause.frontend.code === 'password-policy-violation') return 'auth.passwordRejected';
    if (cause.frontend.code === 'invalid-request') return 'auth.invalidInput';
    return cause.frontend.messageKey;
}

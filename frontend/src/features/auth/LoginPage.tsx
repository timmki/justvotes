import {type FormEvent, useId, useRef, useState, useSyncExternalStore} from 'react';
import {apiClient, sessionCoordinator} from '../../shared/api/client';
import {ApiError} from '../../shared/api/errors';
import {queryClient} from '../../shared/api/queryClient';
import {queryKeys} from '../../shared/api/queryKeys';
import {useI18n} from '../../shared/i18n/I18nProvider';
import {PageFrame} from '../../shared/ui/PageFrame';

type LoginError = {kind: 'credentials'} | {kind: 'throttled'; seconds: number} | {kind: 'other'; messageKey: ApiError['frontend']['messageKey']};

export function LoginPage() {
    const {t} = useI18n();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<LoginError | null>(null);
    const errorId = useId();
    const emailRef = useRef<HTMLInputElement>(null);
    const expired = useSyncExternalStore((listener) => sessionCoordinator.subscribe(listener),
        () => sessionCoordinator.isLoginRequired(), () => false);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setPending(true);
        setError(null);
        try {
            const session = await apiClient.login({email: email.trim(), password});
            // The application gate now renders the signed-in routes and restores the remembered route.
            queryClient.setQueryData(queryKeys.session, session);
        } catch (cause) {
            setError(loginError(cause));
            setPassword('');
            emailRef.current?.focus();
        } finally {
            setPending(false);
        }
    }

    let describedBy: string | undefined;
    if (error) describedBy = errorId;
    let submitLabel = t('auth.signIn');
    if (pending) submitLabel = t('auth.signingIn');

    return <PageFrame className="auth-page" title={t('auth.loginTitle')} description={t('auth.loginDescription')}>
        {expired && <p className="session-notice" role="status">{t('auth.sessionExpired')}</p>}
        <form className="login-form" onSubmit={submit} aria-describedby={describedBy} noValidate>
            <label htmlFor="login-email">{t('auth.email')}</label>
            <input ref={emailRef} id="login-email" name="email" type="email" autoComplete="username" required autoFocus
                   value={email} aria-invalid={Boolean(error)} onChange={(event) => setEmail(event.target.value)}/>
            <label htmlFor="login-password">{t('auth.password')}</label>
            <input id="login-password" name="password" type="password" autoComplete="current-password" required
                   value={password} aria-invalid={Boolean(error)} onChange={(event) => setPassword(event.target.value)}/>
            <button className="primary-button" type="submit" aria-busy={pending} disabled={pending || !email.trim() || !password}>
                {pending && <span className="button-spinner" aria-hidden="true"/>}{submitLabel}
            </button>
            <p id={errorId} className="form-error" role="alert">{error && errorText(error, t)}</p>
        </form>
    </PageFrame>;
}

function loginError(cause: unknown): LoginError {
    if (cause instanceof ApiError && cause.frontend.code === 'invalid-credentials') return {kind: 'credentials'};
    if (cause instanceof ApiError && cause.frontend.code === 'login-throttled') {
        return {kind: 'throttled', seconds: cause.retryAfterSeconds ?? 30};
    }
    if (cause instanceof ApiError) return {kind: 'other', messageKey: cause.frontend.messageKey};
    return {kind: 'other', messageKey: 'errors.generic'};
}

function errorText(error: LoginError, t: ReturnType<typeof useI18n>['t']) {
    if (error.kind === 'credentials') return t('auth.invalidCredentials');
    if (error.kind === 'throttled') return t('auth.throttled').replace('{seconds}', String(error.seconds));
    return t(error.messageKey);
}

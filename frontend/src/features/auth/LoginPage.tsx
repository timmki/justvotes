import {type FormEvent, useEffect, useId, useRef, useState, useSyncExternalStore} from 'react';
import {apiClient, sessionCoordinator} from '../../shared/api/client';
import {ApiError} from '../../shared/api/errors';
import {queryClient} from '../../shared/api/queryClient';
import {queryKeys} from '../../shared/api/queryKeys';
import {useI18n} from '../../shared/i18n/I18nProvider';
import {FormField} from '../../shared/ui/FormField';
import {focusFirstInvalid} from '../../shared/ui/formValidation';
import {PageFrame} from '../../shared/ui/PageFrame';

type LoginError = {kind: 'credentials'} | {kind: 'throttled'; seconds: number} | {kind: 'other'; messageKey: ApiError['frontend']['messageKey']};

export function LoginPage() {
    const {t} = useI18n();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<LoginError | null>(null);
    const [emailMissing, setEmailMissing] = useState(false);
    const [passwordMissing, setPasswordMissing] = useState(false);
    const [submitAttempt, setSubmitAttempt] = useState(0);
    const errorId = useId();
    const formRef = useRef<HTMLFormElement>(null);
    const emailRef = useRef<HTMLInputElement>(null);
    const expired = useSyncExternalStore((listener) => sessionCoordinator.subscribe(listener),
        () => sessionCoordinator.isLoginRequired(), () => false);

    useEffect(() => {
        if (submitAttempt) focusFirstInvalid(formRef.current);
    }, [submitAttempt]);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        // The button stays usable; missing fields are reported at the field (spec 009, FR-019).
        const missingEmail = !email.trim();
        const missingPassword = !password;
        setEmailMissing(missingEmail);
        setPasswordMissing(missingPassword);
        if (missingEmail || missingPassword) {
            setError(null);
            setSubmitAttempt((attempt) => attempt + 1);
            return;
        }
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
    let emailError: string | null = null;
    if (emailMissing) emailError = t('forms.requiredField');
    let passwordError: string | null = null;
    if (passwordMissing) passwordError = t('forms.requiredField');
    let submitLabel = t('auth.signIn');
    if (pending) submitLabel = t('auth.signingIn');

    return <PageFrame className="auth-page" title={t('auth.loginTitle')} description={t('auth.loginDescription')}>
        {expired && <p className="session-notice" role="status">{t('auth.sessionExpired')}</p>}
        <form ref={formRef} className="login-form" onSubmit={submit} aria-describedby={describedBy} noValidate>
            <FormField id="login-email" label={t('auth.email')} error={emailError}>
                <input ref={emailRef} name="email" type="email" autoComplete="username" required autoFocus
                       value={email} aria-invalid={Boolean(error)} onChange={(event) => {
                    setEmail(event.target.value);
                    setEmailMissing(false);
                }}/>
            </FormField>
            <FormField id="login-password" label={t('auth.password')} error={passwordError}>
                <input name="password" type="password" autoComplete="current-password" required
                       value={password} aria-invalid={Boolean(error)} onChange={(event) => {
                    setPassword(event.target.value);
                    setPasswordMissing(false);
                }}/>
            </FormField>
            <button className="primary-button" type="submit" aria-busy={pending} disabled={pending}>
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

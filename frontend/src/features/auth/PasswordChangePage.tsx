import {type FormEvent, useId, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {apiClient} from '../../shared/api/client';
import {ApiError} from '../../shared/api/errors';
import {queryClient} from '../../shared/api/queryClient';
import {queryKeys} from '../../shared/api/queryKeys';
import {useI18n} from '../../shared/i18n/I18nProvider';
import type {TranslationKey} from '../../shared/i18n/translations';
import {PageFrame} from '../../shared/ui/PageFrame';
import {useToast} from '../../shared/ui/ToastProvider';
import {homeRoute, useSessionQuery} from './sessionQueries';

export const MIN_PASSWORD_LENGTH = 12;

export function passwordLength(value: string) {
    return Array.from(value).length;
}

export function PasswordChangePage() {
    const {t} = useI18n();
    const navigate = useNavigate();
    const {showToast} = useToast();
    const session = useSessionQuery().data;
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [repeatPassword, setRepeatPassword] = useState('');
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<TranslationKey | null>(null);
    const policyId = useId();
    const errorId = useId();
    const required = Boolean(session?.passwordChangeRequired);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (passwordLength(newPassword) < MIN_PASSWORD_LENGTH) {
            setError('auth.passwordTooShort');
            return;
        }
        if (newPassword !== repeatPassword) {
            setError('auth.passwordsDiffer');
            return;
        }
        setPending(true);
        setError(null);
        try {
            await apiClient.changePassword({currentPassword, newPassword});
            const updated = await queryClient.fetchQuery({queryKey: queryKeys.session, queryFn: () => apiClient.getSession()});
            showToast(t('auth.passwordChanged'), 'success');
            if (updated) navigate(homeRoute(updated), {replace: true});
        } catch (cause) {
            setError(passwordError(cause));
        } finally {
            setPending(false);
        }
    }

    let description = t('auth.passwordDescription');
    if (required) description = t('auth.passwordRequiredDescription');
    let submitLabel = t('auth.savePassword');
    if (pending) submitLabel = t('auth.saving');
    let describedBy = policyId;
    if (error) describedBy = `${policyId} ${errorId}`;

    return <PageFrame className="auth-page" title={t('auth.passwordTitle')} description={description}>
        <form className="login-form" onSubmit={submit} noValidate>
            <label htmlFor="password-current">{t('auth.currentPassword')}</label>
            <input id="password-current" type="password" autoComplete="current-password" required value={currentPassword}
                   onChange={(event) => setCurrentPassword(event.target.value)}/>
            <label htmlFor="password-new">{t('auth.newPassword')}</label>
            <input id="password-new" type="password" autoComplete="new-password" required value={newPassword}
                   aria-describedby={describedBy} aria-invalid={error !== null && error !== 'auth.currentPasswordInvalid'}
                   onChange={(event) => setNewPassword(event.target.value)}/>
            <p id={policyId} className="form-hint">{t('auth.passwordPolicy')}</p>
            <label htmlFor="password-repeat">{t('auth.repeatPassword')}</label>
            <input id="password-repeat" type="password" autoComplete="new-password" required value={repeatPassword}
                   aria-invalid={error === 'auth.passwordsDiffer'} onChange={(event) => setRepeatPassword(event.target.value)}/>
            <button className="primary-button" type="submit" aria-busy={pending}
                    disabled={pending || !currentPassword || !newPassword || !repeatPassword}>
                {pending && <span className="button-spinner" aria-hidden="true"/>}{submitLabel}
            </button>
            <p id={errorId} className="form-error" role="alert">{error && t(error)}</p>
        </form>
    </PageFrame>;
}

function passwordError(cause: unknown): TranslationKey {
    if (cause instanceof ApiError && cause.frontend.code === 'current-password-invalid') return 'auth.currentPasswordInvalid';
    if (cause instanceof ApiError && cause.frontend.code === 'password-policy-violation') return 'auth.passwordRejected';
    if (cause instanceof ApiError) return cause.frontend.messageKey;
    return 'errors.generic';
}

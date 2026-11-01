import {type FormEvent, useEffect, useId, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {apiClient} from '../../shared/api/client';
import {ApiError} from '../../shared/api/errors';
import {queryClient} from '../../shared/api/queryClient';
import {queryKeys} from '../../shared/api/queryKeys';
import {useI18n} from '../../shared/i18n/I18nProvider';
import type {TranslationKey} from '../../shared/i18n/translations';
import {FormField} from '../../shared/ui/FormField';
import {focusFirstInvalid} from '../../shared/ui/formValidation';
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
    const [missing, setMissing] = useState<ReadonlySet<'current' | 'new' | 'repeat'>>(() => new Set());
    const [submitAttempt, setSubmitAttempt] = useState(0);
    const formRef = useRef<HTMLFormElement>(null);
    const errorId = useId();
    const required = Boolean(session?.passwordChangeRequired);

    useEffect(() => {
        if (submitAttempt) focusFirstInvalid(formRef.current);
    }, [submitAttempt]);

    function changed(field: 'current' | 'new' | 'repeat') {
        setMissing((current) => {
            const next = new Set(current);
            next.delete(field);
            return next;
        });
    }

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const empty = new Set<'current' | 'new' | 'repeat'>();
        if (!currentPassword) empty.add('current');
        if (!newPassword) empty.add('new');
        if (!repeatPassword) empty.add('repeat');
        setMissing(empty);
        if (empty.size) {
            setError(null);
            setSubmitAttempt((attempt) => attempt + 1);
            return;
        }
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
    let formDescribedBy: string | undefined;
    if (error) formDescribedBy = errorId;
    const missingText = (field: 'current' | 'new' | 'repeat') => {
        if (missing.has(field)) return t('forms.requiredField');
        return null;
    };

    return <PageFrame className="auth-page" title={t('auth.passwordTitle')} description={description}>
        <form ref={formRef} className="login-form" onSubmit={submit} aria-describedby={formDescribedBy} noValidate>
            <FormField id="password-current" label={t('auth.currentPassword')} error={missingText('current')}>
                <input type="password" autoComplete="current-password" required value={currentPassword}
                       aria-invalid={error === 'auth.currentPasswordInvalid'} onChange={(event) => {
                    setCurrentPassword(event.target.value);
                    changed('current');
                }}/>
            </FormField>
            <FormField id="password-new" label={t('auth.newPassword')} hint={t('auth.passwordPolicy')} error={missingText('new')}>
                <input type="password" autoComplete="new-password" required value={newPassword}
                       aria-invalid={error !== null && error !== 'auth.currentPasswordInvalid'} onChange={(event) => {
                    setNewPassword(event.target.value);
                    changed('new');
                }}/>
            </FormField>
            <FormField id="password-repeat" label={t('auth.repeatPassword')} error={missingText('repeat')}>
                <input type="password" autoComplete="new-password" required value={repeatPassword}
                       aria-invalid={error === 'auth.passwordsDiffer'} onChange={(event) => {
                    setRepeatPassword(event.target.value);
                    changed('repeat');
                }}/>
            </FormField>
            <button className="primary-button" type="submit" aria-busy={pending} disabled={pending}>
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

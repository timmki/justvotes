import {useMutation} from '@tanstack/react-query';
import {type FormEvent, useState} from 'react';
import type {components} from '../../shared/api/generated/justvotes';
import {apiClient} from '../../shared/api/client';
import {ApiError, type FrontendError} from '../../shared/api/errors';
import {queryClient} from '../../shared/api/queryClient';
import {queryKeys} from '../../shared/api/queryKeys';
import {useApiQuery} from '../../shared/api/useApiQuery';
import {useI18n} from '../../shared/i18n/I18nProvider';
import type {TranslationKey} from '../../shared/i18n/translations';
import {RouteState} from '../../shared/ui/RouteState';
import {formatTimestamp} from '../polls/pollFormatters';
import {ContactImport} from './ContactImport';

export type InvitationSummary = components['schemas']['InvitationSummary'];
type InvitationLocale = 'de' | 'en';

export function invitationStatusKey(invitation: InvitationSummary): TranslationKey {
    if (invitation.status === 'expired') return 'admin.invitationExpired';
    if (invitation.status === 'accepted') return 'admin.invitationAccepted';
    if (invitation.status === 'revoked') return 'admin.invitationRevoked';
    return 'admin.invitationOpen';
}

export function InvitationAdministration() {
    const {t, locale} = useI18n();
    const query = useApiQuery(queryKeys.invitations, () => apiClient.getInvitations());
    const [email, setEmail] = useState('');
    const [invitationLocale, setInvitationLocale] = useState<InvitationLocale>(locale);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<TranslationKey | null>(null);
    const invite = useMutation({
        mutationFn: () => apiClient.createInvitation({email: email.trim(), locale: invitationLocale}),
        onSuccess: async (created) => {
            setEmail('');
            setError(null);
            if (created.deliveryFailed) setMessage(`${t('admin.invitationDeliveryFailed')}: ${created.email}`);
            else setMessage(t('admin.invitationSent').replace('{email}', created.email));
            await queryClient.invalidateQueries({queryKey: queryKeys.invitations});
        },
        onError: (cause) => {
            setMessage(null);
            setError(invitationError(cause));
        },
    });
    const change = useMutation({
        mutationFn: async ({invitation, action}: {invitation: InvitationSummary; action: 'resend' | 'revoke'}) => {
            if (action === 'resend') return apiClient.resendInvitation(invitation.invitationId);
            await apiClient.revokeInvitation(invitation.invitationId);
            return invitation;
        },
        onSuccess: async (invitation, {action}) => {
            setError(null);
            if (action === 'resend') setMessage(t('admin.invitationSent').replace('{email}', invitation.email));
            else setMessage(null);
            await queryClient.invalidateQueries({queryKey: queryKeys.invitations});
        },
        onError: (cause) => setError(invitationError(cause)),
    });

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (email.trim()) invite.mutate();
    }

    function revoke(invitation: InvitationSummary) {
        if (!window.confirm(t('admin.revokeConfirm').replace('{email}', invitation.email))) return;
        change.mutate({invitation, action: 'revoke'});
    }

    let inviteLabel = t('admin.invite');
    if (invite.isPending) inviteLabel = t('admin.inviting');

    return <section className="admin-panel invitation-administration">
        <h3>{t('admin.invitations')}</h3>
        <form className="login-form invite-form" onSubmit={submit} noValidate>
            <h4>{t('admin.inviteTitle')}</h4>
            <label htmlFor="invite-email">{t('admin.inviteEmail')}</label>
            <input id="invite-email" type="email" autoComplete="off" required value={email}
                   aria-invalid={error === 'admin.emailAlreadyInvited'} onChange={(event) => setEmail(event.target.value)}/>
            <label htmlFor="invite-locale">{t('admin.inviteLocale')}</label>
            <select id="invite-locale" value={invitationLocale} onChange={(event) => setInvitationLocale(localeValue(event.target.value))}>
                <option value="de">Deutsch</option>
                <option value="en">English</option>
            </select>
            <button className="primary-button" type="submit" disabled={invite.isPending || !email.trim()} aria-busy={invite.isPending}>
                {invite.isPending && <span className="button-spinner" aria-hidden="true"/>}{inviteLabel}
            </button>
            <p className="form-status" role="status">{message}</p>
            <p className="form-error" role="alert">{error && t(error)}</p>
        </form>
        <ContactImport/>
        {query.isPending && <RouteState status="loading"/>}
        {query.isError && <RouteState status="error" error={frontendError(query.error)} onRetry={() => void query.refetch()}/>}
        {query.data && query.data.length === 0 && <RouteState status="empty" title={t('admin.noInvitations')}/>}
        {query.data && query.data.length !== 0 && <div className="table-scroll"><table className="admin-table admin-card-table">
            <thead><tr>
                <th scope="col">{t('admin.inviteEmail')}</th>
                <th scope="col">{t('admin.accountStatus')}</th>
                <th scope="col">{t('admin.invitationIssuedAt')}</th>
                <th scope="col">{t('admin.invitationExpiresAt')}</th>
                <th scope="col"><span className="sr-only">{t('admin.actions')}</span></th>
            </tr></thead>
            <tbody>{query.data.map((invitation) => <tr key={invitation.invitationId}>
                <th scope="row">{invitation.email}</th>
                <td data-label={t('admin.accountStatus')}><span className="status-badges">
                    <span className={`status-badge status-${invitation.status}`}>{t(invitationStatusKey(invitation))}</span>
                    {invitation.deliveryFailed && <span className="status-badge status-failed">{t('admin.invitationDeliveryFailed')}</span>}
                </span></td>
                <td data-label={t('admin.invitationIssuedAt')}><time dateTime={invitation.issuedAt}>{formatTimestamp(invitation.issuedAt, locale)}</time></td>
                <td data-label={t('admin.invitationExpiresAt')}><time dateTime={invitation.expiresAt}>{formatTimestamp(invitation.expiresAt, locale)}</time></td>
                <td className="admin-table-actions">{(invitation.status === 'open' || invitation.status === 'expired') && <>
                    <button className="text-button" type="button" disabled={change.isPending}
                            onClick={() => change.mutate({invitation, action: 'resend'})}>{t('admin.resendInvitation')}</button>
                    <button className="text-button" type="button" disabled={change.isPending}
                            onClick={() => revoke(invitation)}>{t('admin.revokeInvitation')}</button>
                </>}</td>
            </tr>)}</tbody>
        </table></div>}
    </section>;
}

function localeValue(value: string): InvitationLocale {
    if (value === 'en') return 'en';
    return 'de';
}

function invitationError(cause: unknown): TranslationKey {
    if (!(cause instanceof ApiError)) return 'errors.generic';
    if (cause.frontend.code === 'email-already-invited') return 'admin.emailAlreadyInvited';
    if (cause.frontend.code === 'invitation-delivery-unavailable') return 'admin.deliveryUnavailable';
    if (cause.frontend.code === 'invalid-request') return 'admin.invalidEmail';
    return cause.frontend.messageKey;
}

function frontendError(cause: unknown): FrontendError | undefined {
    if (cause instanceof ApiError) return cause.frontend;
    return undefined;
}

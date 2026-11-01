import {useMutation} from '@tanstack/react-query';
import {useState} from 'react';
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
import {LockIcon} from '../../shared/ui/Icons';

export type AccountSummary = components['schemas']['AccountSummary'];
type AccountAction = 'lock' | 'unlock' | 'oneTimePassword';

export function useAccountsQuery() {
    return useApiQuery(queryKeys.accounts, () => apiClient.getAccounts());
}

export function AccountAdministration() {
    const {t} = useI18n();
    const query = useAccountsQuery();
    const [error, setError] = useState<FrontendError | null>(null);
    const [oneTimePassword, setOneTimePassword] = useState<{name: string; password: string} | null>(null);
    const mutation = useMutation({
        mutationFn: async ({account, action}: {account: AccountSummary; action: AccountAction}) => {
            if (action === 'lock') return {account: await apiClient.lockAccount(account.accountId), password: null};
            if (action === 'unlock') return {account: await apiClient.unlockAccount(account.accountId), password: null};
            const issued = await apiClient.assignOneTimePassword(account.accountId);
            return {account, password: issued.password};
        },
        onSuccess: async ({account, password}) => {
            setError(null);
            if (password) setOneTimePassword({name: account.email, password});
            await queryClient.invalidateQueries({queryKey: queryKeys.accounts});
        },
        onError: (cause) => setError(frontendError(cause) ?? null),
    });

    function run(account: AccountSummary, action: AccountAction) {
        if (action === 'lock' && !window.confirm(t('admin.lockConfirm').replace('{name}', account.email))) return;
        if (action === 'oneTimePassword' && !window.confirm(t('admin.oneTimePasswordConfirm').replace('{name}', account.email))) return;
        setOneTimePassword(null);
        mutation.mutate({account, action});
    }

    if (query.isPending) return <RouteState status="loading"/>;
    if (query.isError) return <RouteState status="error" error={frontendError(query.error)} onRetry={() => void query.refetch()}/>;

    return <section className="admin-panel account-administration">
        {oneTimePassword && <OneTimePasswordNotice name={oneTimePassword.name} password={oneTimePassword.password}
                                                   onClose={() => setOneTimePassword(null)}/>}
        {error && <p className="form-error" role="alert">{t(error.messageKey)}</p>}
        {query.data.length === 0 && <RouteState status="empty" title={t('admin.noAccounts')}/>}
        {query.data.length !== 0 && <div className="table-scroll"><table className="admin-table admin-card-table">
            <thead><tr>
                <th scope="col">{t('admin.accountEmail')}</th>
                <th scope="col">{t('admin.accountIdentity')}</th>
                <th scope="col">{t('admin.accountRole')}</th>
                <th scope="col">{t('admin.accountStatus')}</th>
                <th scope="col"><span className="sr-only">{t('admin.actions')}</span></th>
            </tr></thead>
            <tbody>{query.data.map((account) => <AccountRow key={account.accountId} account={account}
                                                            pending={mutation.isPending} onAction={run}/>)}</tbody>
        </table></div>}
    </section>;
}

function AccountRow({account, pending, onAction}: {
    account: AccountSummary;
    pending: boolean;
    onAction: (account: AccountSummary, action: AccountAction) => void;
}) {
    const {t, locale} = useI18n();
    let roleKey: TranslationKey = 'admin.roleUser';
    if (account.role === 'admin') roleKey = 'admin.roleAdmin';
    let statusKey: TranslationKey = 'admin.statusActive';
    if (account.status === 'locked') statusKey = 'admin.statusLocked';
    return <tr>
        <th scope="row"><span title={`${account.email} · ${formatTimestamp(account.createdAt, locale)}`}>{account.email}</span></th>
        <td data-label={t('admin.accountIdentity')}>{account.identity ?? '—'}</td>
        <td data-label={t('admin.accountRole')}>{t(roleKey)}</td>
        <td data-label={t('admin.accountStatus')}><span className="status-badges">
            <span className={`status-badge status-${account.status}`}>{t(statusKey)}</span>
            {account.passwordChangeRequired && <span className="status-badge">{t('admin.passwordChangePending')}</span>}
        </span></td>
        <td className="admin-table-actions">{account.role === 'user' && <>
            {account.status === 'locked' && <button className="text-button" type="button" disabled={pending}
                                                    onClick={() => onAction(account, 'unlock')}>{t('admin.unlockAccount')}</button>}
            <button className="text-button" type="button" disabled={pending}
                    onClick={() => onAction(account, 'oneTimePassword')}>{t('admin.oneTimePassword')}</button>
            {account.status === 'active' && <span className="action-group-danger">
                <button className="secondary-button destructive-button" type="button" disabled={pending}
                        onClick={() => onAction(account, 'lock')}><LockIcon/>{t('admin.lockAccount')}</button>
            </span>}
        </>}</td>
    </tr>;
}

function OneTimePasswordNotice({name, password, onClose}: {name: string; password: string; onClose: () => void}) {
    const {t} = useI18n();
    const [copied, setCopied] = useState(false);
    async function copy() {
        try {
            await navigator.clipboard.writeText(password);
            setCopied(true);
        } catch {
            setCopied(false);
        }
    }
    let copyLabel = t('admin.copy');
    if (copied) copyLabel = t('admin.copied');
    return <div className="one-time-password" role="alert">
        <h2>{t('admin.oneTimePasswordTitle')}</h2>
        <p>{t('admin.oneTimePasswordText').replace('{name}', name)}</p>
        <p><code className="one-time-password-value">{password}</code></p>
        <div className="account-panel-actions">
            <button className="primary-button" type="button" onClick={copy}>{copyLabel}</button>
            <button className="text-button" type="button" onClick={onClose}>{t('common.dismiss')}</button>
        </div>
    </div>;
}

function frontendError(cause: unknown): FrontendError | undefined {
    if (cause instanceof ApiError) return cause.frontend;
    return undefined;
}

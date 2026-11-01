import {useMutation} from '@tanstack/react-query';
import {type ChangeEvent, useId, useState} from 'react';
import type {components} from '../../shared/api/generated/justvotes';
import {apiClient, type ContactImportPreview, type ContactImportResult} from '../../shared/api/client';
import {ApiError} from '../../shared/api/errors';
import {queryClient} from '../../shared/api/queryClient';
import {queryKeys} from '../../shared/api/queryKeys';
import {useI18n} from '../../shared/i18n/I18nProvider';
import type {TranslationKey} from '../../shared/i18n/translations';

type ContactImportEntry = components['schemas']['ContactImportEntry'];
type ContactImportOutcome = components['schemas']['ContactImportOutcome'];
type ResultEntry = components['schemas']['ContactImportResultEntry'];
type InvitationLocale = 'de' | 'en';

export const MAX_CONTACT_FILE_BYTES = 1024 * 1024;

const OUTCOME_KEYS: Record<ContactImportOutcome, TranslationKey> = {
    'invite': 'admin.contactImportInvite',
    'renew': 'admin.contactImportRenew',
    'has-account': 'admin.contactImportHasAccount',
    'already-invited': 'admin.contactImportAlreadyInvited',
    'duplicate-in-file': 'admin.contactImportDuplicate',
    'missing-email': 'admin.contactImportMissingEmail',
    'invalid-email': 'admin.contactImportInvalidEmail',
};

const REASON_KEYS: Record<NonNullable<ResultEntry['reason']>, TranslationKey> = {
    'has-account': 'admin.contactImportHasAccount',
    'already-invited': 'admin.contactImportAlreadyInvited',
    'invalid-email': 'admin.contactImportInvalidEmail',
    'duplicate-in-request': 'admin.contactImportDuplicateRequest',
};

function selectable(entry: ContactImportEntry) {
    return entry.outcome === 'invite' || entry.outcome === 'renew';
}

function displayName(entry: ContactImportEntry) {
    return entry.name ?? entry.email ?? `#${entry.position}`;
}

function importError(cause: unknown): TranslationKey {
    if (!(cause instanceof ApiError)) return 'errors.generic';
    if (cause.frontend.code === 'contact-import-too-large') return 'admin.contactImportTooLarge';
    if (cause.frontend.code === 'contact-import-too-many') return 'admin.contactImportTooMany';
    if (cause.frontend.code === 'contact-import-invalid') return 'admin.contactImportInvalid';
    if (cause.frontend.code === 'invitation-delivery-unavailable') return 'admin.deliveryUnavailable';
    return cause.frontend.messageKey;
}

/**
 * Invites people from an address book export: the file is checked by the server, the administrator reviews
 * the assessment and confirms the selected contacts.
 */
export function ContactImport() {
    const {t, locale} = useI18n();
    const fileId = useId();
    const localeId = useId();
    const [fileKey, setFileKey] = useState(0);
    const [preview, setPreview] = useState<ContactImportPreview | null>(null);
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [invitationLocale, setInvitationLocale] = useState<InvitationLocale>(locale);
    const [result, setResult] = useState<ContactImportResult | null>(null);
    const [error, setError] = useState<TranslationKey | null>(null);
    // Without mail delivery nothing can be sent, so the import stays locked until the page is reloaded.
    const [deliveryUnavailable, setDeliveryUnavailable] = useState(false);

    function fail(cause: unknown) {
        const key = importError(cause);
        if (key === 'admin.deliveryUnavailable') {
            setPreview(null);
            setDeliveryUnavailable(true);
        }
        setError(key);
    }

    const read = useMutation({
        mutationFn: (content: string) => apiClient.previewContactImport(content),
        onSuccess: (data) => {
            setPreview(data);
            setSelected(new Set(data.contacts.filter(selectable).map((entry) => entry.position)));
        },
        onError: fail,
    });
    const send = useMutation({
        mutationFn: (contacts: ContactImportEntry[]) => apiClient.importContacts({
            locale: invitationLocale,
            contacts: contacts.map((entry) => ({email: entry.email ?? '', name: entry.name ?? null})),
        }),
        onSuccess: async (data) => {
            setPreview(null);
            setResult(data);
            await queryClient.invalidateQueries({queryKey: queryKeys.invitations});
        },
        onError: fail,
    });

    function reset() {
        setPreview(null);
        setResult(null);
        setError(null);
        setSelected(new Set());
        setFileKey((key) => key + 1);
    }

    async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        setPreview(null);
        setResult(null);
        setError(null);
        if (!file) return;
        if (file.size > MAX_CONTACT_FILE_BYTES) {
            setError('admin.contactImportTooLarge');
            return;
        }
        try {
            read.mutate(await readText(file));
        } catch {
            setError('admin.contactImportInvalid');
        }
    }

    function toggle(position: number) {
        setSelected((current) => {
            const next = new Set(current);
            if (next.has(position)) next.delete(position);
            else next.add(position);
            return next;
        });
    }

    const choosable = preview?.contacts.filter(selectable) ?? [];
    const allSelected = choosable.length > 0 && choosable.every((entry) => selected.has(entry.position));

    function toggleAll() {
        if (allSelected) setSelected(new Set());
        else setSelected(new Set(choosable.map((entry) => entry.position)));
    }

    let status = '';
    if (read.isPending) status = t('admin.contactImportReading');
    if (send.isPending) status = t('admin.contactImportSending');

    return <section className="login-form contact-import" aria-labelledby={`${fileId}-title`}>
        <h4 id={`${fileId}-title`}>{t('admin.contactImportTitle')}</h4>
        <p className="form-hint">{t('admin.contactImportDescription')}</p>
        {!preview && !result && <>
            <label htmlFor={fileId}>{t('admin.contactImportFile')}</label>
            <input key={fileKey} id={fileId} type="file" accept=".vcf,text/vcard,text/x-vcard"
                   disabled={read.isPending || deliveryUnavailable} onChange={(event) => void chooseFile(event)}/>
        </>}
        <p className="form-status" role="status">{status}</p>
        <p className="form-error" role="alert">{error && t(error)}</p>
        {preview && <ContactPreview preview={preview} selected={selected} allSelected={allSelected}
                                    onToggle={toggle} onToggleAll={toggleAll}/>}
        {preview && <div className="contact-import-actions">
            <label htmlFor={localeId}>{t('admin.inviteLocale')}</label>
            <select id={localeId} value={invitationLocale}
                    onChange={(event) => setInvitationLocale(localeOf(event.target.value))}>
                <option value="de">Deutsch</option>
                <option value="en">English</option>
            </select>
            <div className="contact-import-buttons">
                <button className="primary-button" type="button" disabled={selected.size === 0 || send.isPending}
                        aria-busy={send.isPending}
                        onClick={() => send.mutate(preview.contacts.filter((entry) => selected.has(entry.position)))}>
                    {send.isPending && <span className="button-spinner" aria-hidden="true"/>}
                    {t('admin.contactImportConfirm').replace('{count}', String(selected.size))}
                </button>
                <button className="text-button" type="button" disabled={send.isPending} onClick={reset}>
                    {t('admin.contactImportCancel')}
                </button>
            </div>
        </div>}
        {result && <ImportSummary result={result} onAnother={reset}/>}
    </section>;
}

function ContactPreview({preview, selected, allSelected, onToggle, onToggleAll}: {
    preview: ContactImportPreview;
    selected: Set<number>;
    allSelected: boolean;
    onToggle: (position: number) => void;
    onToggleAll: () => void;
}) {
    const {t} = useI18n();
    const selectAllId = useId();
    let unreadable: string | null = null;
    if (preview.unreadableEntries === 1) unreadable = t('admin.contactImportUnreadableOne');
    if (preview.unreadableEntries > 1) {
        unreadable = t('admin.contactImportUnreadable').replace('{count}', String(preview.unreadableEntries));
    }
    return <div className="contact-import-preview">
        <h5>{t('admin.contactImportPreview')}</h5>
        {unreadable && <p className="session-notice" role="status">{unreadable}</p>}
        <div className="select-all">
            <input id={selectAllId} type="checkbox" checked={allSelected} onChange={onToggleAll}
                   disabled={!preview.contacts.some(selectable)}/>
            <label htmlFor={selectAllId}>{t('admin.contactImportSelectAll')}</label>
        </div>
        <div className="table-scroll"><table className="admin-table admin-card-table">
            <thead><tr>
                <th scope="col">{t('admin.contactImportName')}</th>
                <th scope="col">{t('admin.contactImportEmail')}</th>
                <th scope="col">{t('admin.contactImportOutcome')}</th>
            </tr></thead>
            <tbody>{preview.contacts.map((entry) => <tr key={entry.position}>
                <th scope="row">
                    {selectable(entry) && <label className="contact-choice">
                        <input type="checkbox" checked={selected.has(entry.position)} onChange={() => onToggle(entry.position)}
                               aria-label={t('admin.contactImportSelect').replace('{name}', displayName(entry))}/>
                        <span>{displayName(entry)}</span>
                    </label>}
                    {!selectable(entry) && <span>{displayName(entry)}</span>}
                </th>
                <td data-label={t('admin.accountEmail')}>{entry.email ?? '—'}</td>
                <td data-label={t('admin.contactImportOutcome')}>
                    <span className={`status-badge contact-outcome-${entry.outcome}`}>{t(OUTCOME_KEYS[entry.outcome])}</span>
                </td>
            </tr>)}</tbody>
        </table></div>
    </div>;
}

function ImportSummary({result, onAnother}: {result: ContactImportResult; onAnother: () => void}) {
    const {t} = useI18n();
    const skipped = result.entries.filter((entry) => entry.outcome === 'skipped');
    const summary = t('admin.contactImportSummary')
        .replace('{invited}', String(result.invited))
        .replace('{renewed}', String(result.renewed))
        .replace('{skipped}', String(skipped.length));
    return <div className="contact-import-summary" role="status">
        <p>{summary}</p>
        {result.deliveryFailed > 0 && <p className="form-error">
            {t('admin.contactImportDeliveryFailed').replace('{count}', String(result.deliveryFailed))}
        </p>}
        {skipped.length > 0 && <>
            <h5>{t('admin.contactImportSkipped')}</h5>
            <ul className="contact-import-skipped">{skipped.map((entry) => <li key={entry.email}>
                <span>{entry.email}</span> – {entry.reason && t(REASON_KEYS[entry.reason])}
            </li>)}</ul>
        </>}
        <button className="text-button" type="button" onClick={onAnother}>{t('admin.contactImportAnother')}</button>
    </div>;
}

function readText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ''));
        reader.onerror = () => reject(reader.error ?? new Error('The file could not be read.'));
        reader.readAsText(file, 'UTF-8');
    });
}

function localeOf(value: string): InvitationLocale {
    if (value === 'en') return 'en';
    return 'de';
}

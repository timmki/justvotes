import {useMutation} from '@tanstack/react-query';
import {type FormEvent, useEffect, useRef, useState} from 'react';
import {Link, useLocation, useNavigate} from 'react-router-dom';
import type {components} from '../../shared/api/generated/justvotes';
import {apiClient} from '../../shared/api/client';
import {ApiError, type FrontendError} from '../../shared/api/errors';
import {queryClient} from '../../shared/api/queryClient';
import {queryKeys} from '../../shared/api/queryKeys';
import {useApiQuery} from '../../shared/api/useApiQuery';
import {useI18n} from '../../shared/i18n/I18nProvider';
import {QueryState} from '../../shared/ui/QueryState';
import {RouteState} from '../../shared/ui/RouteState';
import {ChevronRightIcon, TrashIcon} from '../../shared/ui/Icons';
import {formatVoteCount} from '../polls/pollFormatters';
import {FormField} from '../../shared/ui/FormField';
import {focusFirstInvalid} from '../../shared/ui/formValidation';
import {catalogQueries} from './catalogQueries';
import {groupName} from './TemplateCatalog';

type Poll = components['schemas']['Poll'];
type PollState = Poll['state'];
type PollAction =
    'publish'
    | 'makePrivate'
    | 'changeExpiry'
    | 'archive'
    | 'restoreFromArchive'
    | 'reopen'
    | 'softDelete'
    | 'restore'
    | 'permanentDelete';
type PollMutation =
    | { action: 'replaceOptions'; optionTexts: string[] }
    | { action: 'publish'; endsAt: string }
    | { action: 'changeExpiry'; endsAt: string }
    | { action: Exclude<PollAction, 'publish' | 'changeExpiry'> };

const actionMatrix: Record<PollState, readonly PollAction[]> = {
    draft: ['publish'],
    active: ['makePrivate', 'archive', 'softDelete'],
    expired: ['changeExpiry', 'archive', 'reopen', 'softDelete'],
    archived: ['restoreFromArchive', 'softDelete'],
    deleted: ['restore', 'permanentDelete'],
};

const visibleOptionLimit = 10;

/**
 * A compact list: every poll is one collapsed row with its key facts; options and actions open on demand.
 * New polls are created in a panel opened by "New poll" (spec 009, US3).
 */
export function AdminPolls() {
    const {t} = useI18n();
    const {pathname} = useLocation();
    const query = useApiQuery(queryKeys.adminPolls, () => apiClient.getAdminPolls());
    const [expandedPollIds, setExpandedPollIds] = useState<ReadonlySet<string>>(() => new Set());
    const [createOpen, setCreateOpen] = useState(pathname === '/admin/create');
    const newPollButtonRef = useRef<HTMLButtonElement>(null);
    const returnFocusToNewPoll = useRef(false);

    useEffect(() => {
        if (createOpen || !returnFocusToNewPoll.current) return;
        returnFocusToNewPoll.current = false;
        newPollButtonRef.current?.focus();
    }, [createOpen]);

    function toggle(pollId: string) {
        setExpandedPollIds((current) => {
            const next = new Set(current);
            if (next.has(pollId)) next.delete(pollId);
            else next.add(pollId);
            return next;
        });
    }

    function forget(pollId: string) {
        setExpandedPollIds((current) => {
            const next = new Set(current);
            next.delete(pollId);
            return next;
        });
    }

    function closeCreate() {
        returnFocusToNewPoll.current = true;
        setCreateOpen(false);
    }

    function created(poll: Poll) {
        setExpandedPollIds((current) => new Set(current).add(poll.id));
        closeCreate();
    }

    return <>
        <div className="admin-toolbar">
            <button ref={newPollButtonRef} className="primary-button" type="button" aria-expanded={createOpen}
                    onClick={() => setCreateOpen(true)} disabled={createOpen}>{t('admin.newPoll')}</button>
        </div>
        {createOpen && <CreatePoll onCreated={created} onCancel={closeCreate}/>}
        <QueryState query={query}>{(polls) => <section className="admin-panel">
            {polls.length === 0 && <p className="stale-state">{t('admin.noPolls')}</p>}
            {polls.length !== 0 &&
            <ul className="poll-admin-list">{polls.map((poll) => <PollAdministrationCard key={poll.id} poll={poll}
                expanded={expandedPollIds.has(poll.id)} onToggle={() => toggle(poll.id)}
                onRemoved={() => forget(poll.id)}/>)}</ul>}
        </section>}</QueryState>
    </>;
}

function PollAdministrationCard({poll, expanded, onToggle, onRemoved}: {
    poll: Poll;
    expanded: boolean;
    onToggle: () => void;
    onRemoved: () => void;
}) {
    const {t, locale} = useI18n();
    const [showAllOptions, setShowAllOptions] = useState(false);
    const [editingOptions, setEditingOptions] = useState(false);
    const [optionDraft, setOptionDraft] = useState(() => poll.options.map((option) => option.text).join('\n'));
    const [optionsInvalid, setOptionsInvalid] = useState(false);
    const [error, setError] = useState<FrontendError | null>(null);
    const mutation = useMutation({
        mutationFn: (request: PollMutation) => executePollMutation(poll.id, request),
        onSuccess: async (updated) => {
            if (updated) updatePollCache(updated);
            else {
                queryClient.setQueryData<Poll[]>(queryKeys.adminPolls, (current) => current?.filter((candidate) => candidate.id !== poll.id));
                onRemoved();
            }
            setEditingOptions(false);
            setError(null);
            await Promise.all([
                queryClient.invalidateQueries({queryKey: queryKeys.adminPolls}),
                queryClient.invalidateQueries({queryKey: queryKeys.publicPolls}),
                queryClient.invalidateQueries({queryKey: queryKeys.poll(poll.id)}),
                queryClient.invalidateQueries({queryKey: queryKeys.pollResults(poll.id)}),
                queryClient.invalidateQueries({queryKey: queryKeys.pollAudit(poll.id)}),
            ]);
        },
        onError: (cause) => setError(frontendError(cause)),
    });
    const actions = actionMatrix[poll.state].filter((action) => action !== 'makePrivate' || poll.visibility === 'public');
    const canReopen = poll.endsAt !== null && new Date(poll.endsAt).getTime() > Date.now();

    useEffect(() => {
        if (!editingOptions) setOptionDraft(poll.options.map((option) => option.text).join('\n'));
    }, [editingOptions, poll.options]);

    function submitOptions(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const optionTexts = optionDraft.split('\n').map((text) => text.trim()).filter(Boolean);
        if (optionTexts.length < 2) {
            setOptionsInvalid(true);
            return;
        }
        setOptionsInvalid(false);
        mutation.mutate({action: 'replaceOptions', optionTexts});
    }

    function requestAction(action: Exclude<PollAction, 'publish' | 'changeExpiry'>) {
        const title = () => poll.title;
        if (action === 'softDelete' && !window.confirm(t('admin.confirmSoftDelete').replace('{title}', title))) return;
        if (action === 'permanentDelete' && (!window.confirm(t('admin.confirmPermanentDelete').replace('{title}', title))
            || !window.confirm(t('admin.confirmPermanentDeleteAgain')))) return;
        mutation.mutate({action});
    }

    let visibilityKey: 'admin.public' | 'admin.private' = 'admin.private';
    if (poll.visibility === 'public') visibilityKey = 'admin.public';
    let reopenTitle: string | undefined;
    if (actions.includes('reopen') && !canReopen) reopenTitle = t('admin.reopenNeedsFutureExpiry');
    let expiry = t('admin.noExpiry');
    if (poll.endsAt) expiry = t('admin.expiresAt').replace('{date}', formatDate(poll.endsAt, locale));
    let visibleOptions = poll.options;
    if (!showAllOptions) visibleOptions = poll.options.slice(0, visibleOptionLimit);
    const hiddenOptionCount = poll.options.length - visibleOptions.length;
    const bodyId = `poll-admin-body-${poll.id}`;
    let rowClassName = 'poll-admin-card';
    if (expanded) rowClassName += ' expanded';
    return <li className={rowClassName}>
        <div className="poll-admin-heading">
            <h2 className="poll-admin-title"><button className="poll-admin-toggle" type="button" aria-expanded={expanded}
                                                      aria-controls={bodyId} onClick={onToggle}>
                <span>{poll.title}</span><ChevronRightIcon/></button></h2>
            <p className="poll-admin-meta">{t(visibilityKey)} · {t(stateTranslationKey(poll.state))} · {expiry} · {formatVoteCount(poll.totalVotes, locale, t)}</p>
        </div>
        <div id={bodyId} className="poll-admin-body" hidden={!expanded}>
        <section className="poll-admin-options" aria-labelledby={`options-${poll.id}`}><h3
                id={`options-${poll.id}`}>{t('admin.currentOptions')}</h3>{editingOptions &&
                <form className="catalog-form" onSubmit={submitOptions}><label
                    htmlFor={`options-edit-${poll.id}`}>{t('admin.optionsInput')}</label><textarea
                    id={`options-edit-${poll.id}`} rows={5} value={optionDraft} onChange={(event) => {
                    setOptionDraft(event.target.value);
                    setOptionsInvalid(false);
                }}/>{optionsInvalid && <p className="form-error" role="alert">{t('errors.generic')}</p>}
                    <div className="identity-actions">
                        <button className="primary-button" type="submit"
                                aria-busy={mutation.isPending} disabled={mutation.isPending}>{mutation.isPending && <span className="button-spinner" aria-hidden="true"/>}{t('forms.submit')}</button>
                        <button className="text-button" type="button" onClick={() => setEditingOptions(false)}
                                disabled={mutation.isPending}>{t('forms.cancel')}</button>
                    </div>
                </form>}{!editingOptions && <>
                    <ol className="poll-options">{visibleOptions.map((option) => <li key={option.number}
                                                                                   value={option.number}>{option.text}</li>)}</ol>
                    {hiddenOptionCount > 0 && <button className="text-button" type="button" onClick={() => setShowAllOptions(true)}>
                        {t('admin.showAllOptions').replace('{count}', String(poll.options.length))}</button>}
                    {poll.state === 'draft' && <button className="secondary-button" type="button" onClick={() => {
                        setOptionsInvalid(false);
                        setEditingOptions(true);
                    }}>{t('admin.editOptions')}</button>}</>}</section>
        <div className="poll-admin-actions"><h3>{t('admin.actions')}</h3>{actions.includes('publish') &&
            <ExpiryForm key={`${poll.id}-publish`} inputId={`${poll.id}-publish-expiry`} label={t('admin.publish')}
                        submitLabel={t('admin.publish')}
                        onSubmit={(endsAt) => mutation.mutate({action: 'publish', endsAt})}
                        pending={mutation.isPending}/>}{actions.includes('changeExpiry') &&
            <ExpiryForm key={`${poll.id}-${poll.endsAt ?? 'none'}-expiry`} inputId={`${poll.id}-change-expiry`}
                        label={t('admin.changeExpiry')} initialValue={poll.endsAt} submitLabel={t('admin.changeExpiry')}
                        onSubmit={(endsAt) => mutation.mutate({action: 'changeExpiry', endsAt})}
                        pending={mutation.isPending}/>}{actions.includes('makePrivate') &&
            <button className="secondary-button" type="button" onClick={() => requestAction('makePrivate')}
                    disabled={mutation.isPending}>{t('admin.makePrivate')}</button>}{actions.includes('archive') &&
            <button className="secondary-button" type="button" onClick={() => requestAction('archive')}
                    disabled={mutation.isPending}>{t('admin.archive')}</button>}{actions.includes('restoreFromArchive') &&
            <button className="secondary-button" type="button" onClick={() => requestAction('restoreFromArchive')}
                    disabled={mutation.isPending}>{t('admin.restoreFromArchive')}</button>}{actions.includes('reopen') &&
            <button className="secondary-button" type="button" onClick={() => requestAction('reopen')}
                    disabled={mutation.isPending || !canReopen}
                    title={reopenTitle}>{t('admin.reopen')}</button>}{actions.includes('restore') &&
            <button className="secondary-button" type="button" onClick={() => requestAction('restore')}
                    disabled={mutation.isPending}>{t('admin.restore')}</button>}
            {(actions.includes('softDelete') || actions.includes('permanentDelete')) && <div className="action-group-danger">
                {actions.includes('softDelete') && <button className="secondary-button destructive-button" type="button"
                        onClick={() => requestAction('softDelete')}
                        disabled={mutation.isPending}><TrashIcon/>{t('admin.softDelete')}</button>}
                {actions.includes('permanentDelete') && <button className="secondary-button destructive-button" type="button"
                        onClick={() => requestAction('permanentDelete')}
                        disabled={mutation.isPending}><TrashIcon/>{t('admin.permanentDelete')}</button>}
            </div>}</div>
        {error && <p className="form-error" role="alert">{t(error.messageKey)}</p>}
        <p className="poll-admin-links"><Link
            to={`/poll/${encodeURIComponent(poll.id)}`}>{t('admin.openPoll')}</Link> · <Link
            to={`/poll/results/${encodeURIComponent(poll.id)}`}>{t('polls.results')}</Link> · <Link
            to={`/poll/audit/${encodeURIComponent(poll.id)}`}>{t('audit.title')}</Link></p>
        </div>
    </li>;
}

function ExpiryForm({inputId, label, initialValue, submitLabel, onSubmit, pending}: {
    inputId: string;
    label: string;
    initialValue?: string | null;
    submitLabel: string;
    onSubmit: (endsAt: string) => void;
    pending: boolean
}) {
    const {t} = useI18n();
    const [value, setValue] = useState(() => toDateTimeLocal(initialValue));
    const [invalid, setInvalid] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        if (invalid) focusFirstInvalid(formRef.current);
    }, [invalid]);

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const endsAt = parseFutureDate(value);
        if (!endsAt) {
            setInvalid(true);
            return;
        }
        setInvalid(false);
        onSubmit(endsAt);
    }

    let error: string | null = null;
    if (invalid) error = t('admin.invalidExpiry');
    return <form ref={formRef} className="expiry-form" onSubmit={submit} noValidate>
        <FormField id={inputId} label={label} error={error}>
            <input type="datetime-local" value={value} required onChange={(event) => {
                setValue(event.target.value);
                setInvalid(false);
            }}/>
        </FormField>
        <button className="secondary-button" type="submit" disabled={pending}>{submitLabel}</button>
    </form>;
}

/**
 * The form behind "New poll". Missing fields are reported at the field on submit; only sending locks the button.
 */
export function CreatePoll({onCreated, onCancel}: { onCreated: (poll: Poll) => void; onCancel: () => void }) {
    const {t} = useI18n();
    const navigate = useNavigate();
    const {pathname} = useLocation();
    const formRef = useRef<HTMLFormElement>(null);
    const titleRef = useRef<HTMLInputElement>(null);
    const [title, setTitle] = useState('');
    const [groupId, setGroupId] = useState('');
    const [titleMissing, setTitleMissing] = useState(false);
    const [groupMissing, setGroupMissing] = useState(false);
    const [error, setError] = useState<FrontendError | null>(null);
    const groupsQuery = catalogQueries.useCatalogGroups();
    const groups = groupsQuery.data ?? [];
    const membershipQueries = catalogQueries.useCatalogGroupMemberships(groups);
    const availableGroups = groups.filter((_, index) => (membershipQueries[index]?.data?.length ?? 0) > 0);
    const membershipError = membershipQueries.find((query) => query.isError)?.error;
    const membershipPending = membershipQueries.some((query) => query.isPending);
    const formShown = !groupsQuery.isPending && !groupsQuery.isError && !membershipError && !membershipPending;
    const mutation = useMutation({
        mutationFn: () => apiClient.createPoll({title: title.trim(), templateGroupId: groupId}),
        onSuccess: async (poll) => {
            await Promise.all([queryClient.invalidateQueries({queryKey: queryKeys.adminPolls}), queryClient.invalidateQueries({queryKey: queryKeys.publicPolls})]);
            if (pathname === '/admin/create') navigate('/admin/polls');
            onCreated(poll);
        },
        onError: (cause) => setError(frontendError(cause)),
    });

    useEffect(() => {
        if (formShown) titleRef.current?.focus();
    }, [formShown]);

    useEffect(() => {
        if (titleMissing || groupMissing) focusFirstInvalid(formRef.current);
    }, [titleMissing, groupMissing]);

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const missingTitle = !title.trim();
        const missingGroup = !groupId || !availableGroups.some((group) => group.id === groupId);
        setTitleMissing(missingTitle);
        setGroupMissing(missingGroup);
        if (missingTitle || missingGroup) {
            focusFirstInvalid(formRef.current);
            return;
        }
        setError(null);
        mutation.mutate();
    }

    let titleError: string | null = null;
    if (titleMissing) titleError = t('forms.requiredField');
    let groupError: string | null = null;
    if (groupMissing) groupError = t('forms.requiredField');
    return <QueryState query={groupsQuery}>{() => {
        if (membershipError) {
            let error: FrontendError | undefined;
            if (membershipError instanceof ApiError) error = membershipError.frontend;
            return <RouteState status="error" error={error}/>;
        }
        if (membershipPending) return <RouteState status="loading"/>;
        return <section className="admin-panel create-poll-panel" aria-labelledby="create-poll-heading">
            <h2 id="create-poll-heading">{t('admin.newPoll')}</h2>{availableGroups.length === 0 &&
            <p className="stale-state">{t('admin.noNonEmptyGroups')}</p>}
            <form ref={formRef} className="catalog-form" onSubmit={submit} noValidate>
                <FormField id="poll-title" label={t('admin.pollTitle')} error={titleError}>
                    <input ref={titleRef} required value={title} onChange={(event) => {
                        setTitle(event.target.value);
                        setTitleMissing(false);
                    }}/>
                </FormField>
                <FormField id="poll-group" label={t('admin.templateGroup')} error={groupError}>
                    <select required value={groupId} onChange={(event) => {
                        setGroupId(event.target.value);
                        setGroupMissing(false);
                    }}>
                        <option value="">{t('admin.selectGroup')}</option>
                        {availableGroups.map((group) => <option key={group.id} value={group.id}>{groupName(group, t)}</option>)}
                    </select>
                </FormField>
                <div className="form-actions">
                    <button className="primary-button" type="submit" aria-busy={mutation.isPending}
                            disabled={mutation.isPending}>{mutation.isPending && <span className="button-spinner" aria-hidden="true"/>}{mutation.isPending && t('common.saving')}{!mutation.isPending && t('forms.submit')}</button>
                    <button className="text-button" type="button" onClick={onCancel}
                            disabled={mutation.isPending}>{t('forms.cancel')}</button>
                </div>
                {error && <p className="form-error" role="alert">{t(error.messageKey)}</p>}
            </form>
        </section>;
    }}</QueryState>;
}

async function executePollMutation(pollId: string, request: PollMutation) {
    switch (request.action) {
        case 'replaceOptions':
            return apiClient.replacePollOptions(pollId, request.optionTexts);
        case 'publish':
            return apiClient.publishPoll(pollId, request.endsAt);
        case 'makePrivate':
            return apiClient.makePollPrivate(pollId);
        case 'changeExpiry':
            return apiClient.changePollExpiry(pollId, request.endsAt);
        case 'archive':
            return apiClient.archivePoll(pollId);
        case 'restoreFromArchive':
            return apiClient.restorePollFromArchive(pollId);
        case 'reopen':
            return apiClient.reopenPoll(pollId);
        case 'softDelete':
            return apiClient.deletePoll(pollId);
        case 'restore':
            return apiClient.restorePoll(pollId);
        case 'permanentDelete':
            return apiClient.permanentlyDeletePoll(pollId);
        default:
            return assertNever(request);
    }
}

function updatePollCache(updated: Poll) {
    queryClient.setQueryData<Poll[]>(queryKeys.adminPolls, (current) => current?.map((poll) => {
        if (poll.id === updated.id) return updated;
        return poll;
    }));
}

function assertNever(value: never): never {
    throw new Error(`Unknown poll action: ${JSON.stringify(value)}`);
}

function parseFutureDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) return null;
    return date.toISOString();
}

function toDateTimeLocal(value?: string | null) {
    if (!value) return '';
    const date = new Date(value);
    const pad = (part: number) => String(part).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDate(value: string, locale: string) {
    return new Intl.DateTimeFormat(locale, {dateStyle: 'medium', timeStyle: 'short'}).format(new Date(value));
}

function frontendError(cause: unknown): FrontendError {
    if (cause instanceof ApiError) return cause.frontend;
    return {
        kind: 'problem',
        status: null,
        code: 'unexpected_error',
        detail: null,
        retryable: false,
        messageKey: 'errors.generic'
    };
}

function stateTranslationKey(state: PollState) {
    const keys = {
        draft: 'admin.stateDraft',
        active: 'admin.stateActive',
        expired: 'admin.stateExpired',
        archived: 'admin.stateArchived',
        deleted: 'admin.stateDeleted'
    } as const;
    return keys[state];
}

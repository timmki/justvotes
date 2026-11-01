import {type FormEvent, useEffect, useState} from 'react';
import {ApiError, type FrontendError} from '../../shared/api/errors';
import {useI18n} from '../../shared/i18n/I18nProvider';
import {QueryState} from '../../shared/ui/QueryState';
import {RouteState} from '../../shared/ui/RouteState';
import {FormField} from '../../shared/ui/FormField';
import {TrashIcon} from '../../shared/ui/Icons';
import {
    catalogCommands,
    type CatalogGroup,
    type CatalogTemplate,
    normalizeName,
} from './catalogCommands';
import {catalogQueries} from './catalogQueries';

type FailedEntry = { name: string; error: FrontendError | null };
type BatchResult = { created: string[]; skipped: string[]; failed: FailedEntry[] };
type DeleteResult = { deleted: string[]; failed: FailedEntry[] };
type BusyMessage = 'common.saving' | 'common.processing';
const PAGE_SIZE = 20;

export function TemplateCatalogTemplates() {
    const query = catalogQueries.useCatalogTemplates();
    return <QueryState query={query}>{(templates) => <TemplateManager templates={templates}/>}</QueryState>;
}

function TemplateManager({templates}: { templates: CatalogTemplate[] }) {
    const {t} = useI18n();
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [newName, setNewName] = useState('');
    const [newNameMissing, setNewNameMissing] = useState(false);
    const [batchInput, setBatchInput] = useState('');
    const [renameId, setRenameId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [renameMissing, setRenameMissing] = useState(false);
    const [busy, setBusy] = useState(false);
    const [busyMessage, setBusyMessage] = useState<BusyMessage>('common.saving');
    const [error, setError] = useState<FrontendError | null>(null);
    const [batchResult, setBatchResult] = useState<BatchResult | null>(null);
    const [deleteResult, setDeleteResult] = useState<DeleteResult | null>(null);

    const filtered = templates.filter((template) => matchesGlob(template.name, search));
    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(page, pageCount - 1);
    const visible = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
    const visibleIds = visible.filter((template) => !template.managed).map((template) => template.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

    useEffect(() => {
        const existingIds = new Set(templates.map((template) => template.id));
        setSelected((current) => {
            const next = new Set([...current].filter((id) => existingIds.has(id)));
            if (next.size === current.size) return current;
            return next;
        });
    }, [templates]);

    function toggleSelection(id: string) {
        setSelected((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    function toggleVisibleSelection() {
        setSelected((current) => {
            const next = new Set(current);
            if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
            else visibleIds.forEach((id) => next.add(id));
            return next;
        });
    }

    async function createTemplate(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const name = normalizeName(newName);
        setNewNameMissing(!name);
        if (!name) {
            event.currentTarget.querySelector<HTMLInputElement>('input')?.focus();
            return;
        }
        setBusy(true);
        setBusyMessage('common.saving');
        setError(null);
        setBatchResult(null);
        try {
            await catalogCommands.createTemplate(name);
            setNewName('');
        } catch (cause) {
            setError(frontendError(cause));
        } finally {
            setBusy(false);
        }
    }

    async function importTemplates(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setBusy(true);
        setBusyMessage('common.saving');
        setError(null);
        setDeleteResult(null);
        try {
            const result = await catalogCommands.importTemplates(batchInput, templates);
            const failed = result.failed.map((entry) => ({name: entry.name, error: frontendError(entry.error)}));
            setBatchResult({
                created: result.created.map((entry) => entry.name),
                skipped: result.skipped.map((entry) => {
                    if (entry.kind === 'empty') return t('admin.emptyBatchValue');
                    return entry.name;
                }),
                failed,
            });
            if (failed.length === 0) setBatchInput('');
            else setBatchInput(failed.map((entry) => entry.name).join(', '));
        } catch (cause) {
            setError(frontendError(cause));
        } finally {
            setBusy(false);
        }
    }

    function beginRename(template: CatalogTemplate) {
        setRenameId(template.id);
        setRenameValue(template.name);
        setRenameMissing(false);
        setError(null);
    }

    async function renameTemplate(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!renameId) return;
        const name = normalizeName(renameValue);
        setRenameMissing(!name);
        if (!name) {
            event.currentTarget.querySelector<HTMLInputElement>('input')?.focus();
            return;
        }
        setBusy(true);
        setBusyMessage('common.saving');
        setError(null);
        try {
            await catalogCommands.renameTemplate(renameId, name);
            setRenameId(null);
        } catch (cause) {
            setError(frontendError(cause));
        } finally {
            setBusy(false);
        }
    }

    async function deleteTemplates(toDelete: CatalogTemplate[]) {
        if (!toDelete.length || !window.confirm(t('admin.confirmDeleteTemplates').replace('{count}', String(toDelete.length)))) return;
        setBusy(true);
        setBusyMessage('common.processing');
        setError(null);
        setBatchResult(null);
        try {
            const result = await catalogCommands.deleteTemplates(toDelete);
            const deletedIds = result.deleted.map((template) => template.id);
            const deleted = result.deleted.map((template) => template.name);
            const failed = result.failed.map((entry) => ({name: entry.name, error: frontendError(entry.error)}));
            setSelected((current) => new Set([...current].filter((id) => !deletedIds.includes(id))));
            setDeleteResult({deleted, failed});
        } catch (cause) {
            setError(frontendError(cause));
        } finally {
            setBusy(false);
        }
    }

    return <section className="admin-panel">
        <form className="catalog-form" onSubmit={createTemplate} noValidate>
            <div className="catalog-form-row">
                <FormField id="template-name" label={t('admin.newTemplate')} error={requiredText(newNameMissing, t)}>
                    <input value={newName} required onChange={(event) => {
                        setNewName(event.target.value);
                        setNewNameMissing(false);
                    }}/>
                </FormField>
                <button className="primary-button" type="submit" aria-busy={busy} disabled={busy}>{busy && <span className="button-spinner" aria-hidden="true"/>}{t('admin.createTemplate')}</button>
            </div>
        </form>
        <form className="catalog-form" onSubmit={importTemplates}>
            <FormField id="template-batch" label={t('admin.batchTemplates')}>
                <textarea value={batchInput} onChange={(event) => setBatchInput(event.target.value)}
                          placeholder={t('admin.batchPlaceholder')} rows={3}/>
            </FormField>
            <button className="primary-button" type="submit" disabled={busy}>{t('admin.importTemplates')}</button>
        </form>
        <FormField id="template-search" label={t('admin.searchTemplates')} hint={t('admin.filterHint')}>
            <input value={search} placeholder={t('admin.filterTemplatesPlaceholder')} onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
            }}/>
        </FormField>
        <div className="catalog-actions"><label><input type="checkbox" checked={allVisibleSelected}
                                                       onChange={toggleVisibleSelection}/> {t('admin.selectVisible')}
        </label>
            <div className="action-group-danger">
                <button className="secondary-button destructive-button" type="button" disabled={busy || selected.size === 0}
                        onClick={() => {
                            void deleteTemplates(templates.filter((template) => selected.has(template.id)));
                        }}><TrashIcon/>{t('admin.deleteSelected')} ({selected.size})
                </button>
            </div>
        </div>
        {error && <p className="form-error" role="alert">{t(error.messageKey)}</p>}
        {busy && <p className="form-status" role="status">{t(busyMessage)}</p>}
        {batchResult && <BatchResultView result={batchResult}/>}
        {deleteResult && <DeleteResultView result={deleteResult}/>}
        {visible.length === 0 && <RouteState status="empty"/>}
        {visible.length !== 0 &&
            <ul className="data-list catalog-list">{visible.map((template) => <li key={template.id}>
                <label><input type="checkbox" checked={selected.has(template.id)}
                              onChange={() => toggleSelection(template.id)} disabled={template.managed}
                              aria-label={`${t('admin.selectTemplate')} ${template.name}`}/>
                    <strong>{template.name}</strong>{template.managed && <ManagedBadge/>}</label>
                {!template.managed && <div className="catalog-item-actions">{renameId === template.id &&
                    <form className="catalog-form-row catalog-rename-form" onSubmit={renameTemplate} noValidate>
                        <FormField id={`template-rename-${template.id}`} label={t('admin.renameTemplate')}
                                   error={requiredText(renameMissing, t)}>
                            <input value={renameValue} required onChange={(event) => {
                                setRenameValue(event.target.value);
                                setRenameMissing(false);
                            }}/>
                        </FormField>
                        <button className="secondary-button" type="submit" disabled={busy}>{t('forms.submit')}</button>
                        <button className="text-button" type="button"
                                onClick={() => setRenameId(null)}>{t('forms.cancel')}</button>
                    </form>}{renameId !== template.id && <button className="text-button" type="button"
                                      onClick={() => beginRename(template)}>{t('admin.rename')}</button>}
                    <span className="action-group-danger">
                        <button className="secondary-button destructive-button" type="button" disabled={busy}
                                aria-label={`${t('admin.delete')}: ${template.name}`} onClick={() => {
                            void deleteTemplates([template]);
                        }}><TrashIcon/>{t('admin.delete')}</button>
                    </span>
                </div>}
            </li>)}</ul>}
        <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage}/>
    </section>;
}

function BatchResultView({result}: { result: BatchResult }) {
    const {t} = useI18n();
    return <div className="catalog-result" role="status">
        <strong>{t('admin.batchSummary')}</strong><span>{t('admin.created')}: {result.created.length} ({result.created.join(', ')})</span><span>{t('admin.skipped')}: {result.skipped.length} ({result.skipped.join(', ')})</span><span>{t('admin.failed')}: {result.failed.length}</span>{result.failed.map((entry) =>
        <span key={entry.name}>{entry.name}: {t(entry.error?.messageKey ?? 'errors.generic')}</span>)}</div>;
}

function DeleteResultView({result}: { result: DeleteResult }) {
    const {t} = useI18n();
    return <div className="catalog-result" role="status">
        <strong>{t('admin.deleteSummary')}</strong><span>{t('admin.deleted')}: {result.deleted.length}</span><span>{t('admin.failed')}: {result.failed.length}</span>{result.failed.map((entry) =>
        <span key={entry.name}>{entry.name}: {t(entry.error?.messageKey ?? 'errors.generic')}</span>)}</div>;
}

function Pagination({page, pageCount, onPageChange}: {
    page: number;
    pageCount: number;
    onPageChange: (page: number) => void
}) {
    const {t} = useI18n();
    if (pageCount < 2) return null;
    return <nav className="catalog-pagination" aria-label={t('admin.pagination')}>
        <button className="text-button" type="button" disabled={page === 0}
                onClick={() => onPageChange(page - 1)}>{t('admin.previous')}</button>
        <span>{page + 1} / {pageCount}</span>
        <button className="text-button" type="button" disabled={page === pageCount - 1}
                onClick={() => onPageChange(page + 1)}>{t('admin.next')}</button>
    </nav>;
}

export function TemplateCatalogGroups() {
    const groupsQuery = catalogQueries.useCatalogGroups();
    const templatesQuery = catalogQueries.useCatalogTemplates();
    const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
    const groups = groupsQuery.data ?? [];
    const activeGroup = groups.find((group) => group.id === activeGroupId) ?? groups[0];
    const groupTemplatesQuery = catalogQueries.useCatalogGroupTemplates(activeGroup?.id ?? '', Boolean(activeGroup));

    useEffect(() => {
        if (!activeGroup || !groups.some((group) => group.id === activeGroupId)) setActiveGroupId(groups[0]?.id ?? null);
    }, [activeGroup, activeGroupId, groups]);

    return <QueryState query={groupsQuery}>{(loadedGroups) => <QueryState query={templatesQuery}>{(templates) =>
        <GroupManager groups={loadedGroups} templates={templates} activeGroup={activeGroup}
                      groupTemplatesQuery={groupTemplatesQuery}
                      onSelectGroup={setActiveGroupId}/>}</QueryState>}</QueryState>;
}

function GroupManager({groups, templates, activeGroup, groupTemplatesQuery, onSelectGroup}: {
    groups: CatalogGroup[];
    templates: CatalogTemplate[];
    activeGroup?: CatalogGroup;
    groupTemplatesQuery: ReturnType<typeof catalogQueries.useCatalogGroupTemplates>;
    onSelectGroup: (id: string) => void
}) {
    const {t} = useI18n();
    const [newName, setNewName] = useState('');
    const [newNameMissing, setNewNameMissing] = useState(false);
    const [newDescription, setNewDescription] = useState('');
    const [renameValue, setRenameValue] = useState('');
    const [renameMissing, setRenameMissing] = useState(false);
    const [busy, setBusy] = useState(false);
    const [busyMessage, setBusyMessage] = useState<BusyMessage>('common.saving');
    const [error, setError] = useState<FrontendError | null>(null);
    const [templateFilter, setTemplateFilter] = useState('');
    const [membershipIds, setMembershipIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        setRenameValue(activeGroup?.name ?? '');
    }, [activeGroup?.id, activeGroup?.name]);

    useEffect(() => {
        setMembershipIds(new Set((groupTemplatesQuery.data ?? []).map((template) => template.id)));
    }, [activeGroup?.id, groupTemplatesQuery.data]);

    async function createGroup(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const name = normalizeName(newName);
        setNewNameMissing(!name);
        if (!name) {
            event.currentTarget.querySelector<HTMLInputElement>('input')?.focus();
            return;
        }
        setBusy(true);
        setBusyMessage('common.saving');
        setError(null);
        try {
            const created = await catalogCommands.createGroup({name, description: newDescription});
            setNewName('');
            setNewDescription('');
            onSelectGroup(created.id);
        } catch (cause) {
            setError(frontendError(cause));
        } finally {
            setBusy(false);
        }
    }

    async function renameGroup(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!activeGroup) return;
        const name = normalizeName(renameValue);
        setRenameMissing(!name);
        if (!name) {
            event.currentTarget.querySelector<HTMLInputElement>('input')?.focus();
            return;
        }
        setBusy(true);
        setBusyMessage('common.saving');
        setError(null);
        try {
            await catalogCommands.renameGroup(activeGroup.id, name);
        } catch (cause) {
            setError(frontendError(cause));
        } finally {
            setBusy(false);
        }
    }

    async function deleteGroup() {
        if (!activeGroup || !window.confirm(t('admin.confirmDeleteGroup').replace('{name}', groupName(activeGroup, t)))) return;
        setBusy(true);
        setBusyMessage('common.processing');
        setError(null);
        try {
            await catalogCommands.deleteGroup(activeGroup.id);
        } catch (cause) {
            setError(frontendError(cause));
        } finally {
            setBusy(false);
        }
    }

    async function persistMembership(templateId: string, checked: boolean) {
        if (!activeGroup) return;
        if (checked) await catalogCommands.assignTemplateToGroup(activeGroup.id, templateId);
        else await catalogCommands.removeTemplateFromGroup(activeGroup.id, templateId);
    }

    async function toggleMembership(templateId: string, checked: boolean) {
        if (!activeGroup || membershipIds.has(templateId) === checked) return;
        setMembershipIds((current) => withMembership(current, templateId, checked));
        setBusy(true);
        setBusyMessage('common.processing');
        setError(null);
        try {
            await persistMembership(templateId, checked);
        } catch (cause) {
            setMembershipIds((current) => withMembership(current, templateId, !checked));
            setError(frontendError(cause));
        } finally {
            setBusy(false);
        }
    }

    function changeTemplateFilter(value: string) {
        setTemplateFilter(value);
    }

    async function toggleVisibleTemplates() {
        if (!activeGroup) return;
        const checked = !allVisibleTemplatesSelected;
        const changes = visibleTemplates.filter((template) => membershipIds.has(template.id) !== checked);
        if (changes.length === 0) return;
        setMembershipIds((current) => changes.reduce((next, template) => withMembership(next, template.id, checked), current));
        setBusy(true);
        setBusyMessage('common.processing');
        setError(null);
        let failure: unknown = null;
        try {
            for (const template of changes) {
                try {
                    await persistMembership(template.id, checked);
                } catch (cause) {
                    failure = cause;
                    setMembershipIds((current) => withMembership(current, template.id, !checked));
                }
            }
            if (failure) setError(frontendError(failure));
        } finally {
            setBusy(false);
        }
    }

    const visibleTemplates = templates.filter((template) => matchesGlob(template.name, templateFilter));
    const visibleTemplateIds = visibleTemplates.map((template) => template.id);
    const allVisibleTemplatesSelected = visibleTemplateIds.length > 0
        && visibleTemplateIds.every((id) => membershipIds.has(id));

    return <section className="admin-panel">
        <form className="catalog-form" onSubmit={createGroup} noValidate aria-labelledby="new-group-heading">
            <h2 id="new-group-heading">{t('admin.newGroup')}</h2>
            <div className="catalog-form-row">
                <FormField id="group-name" label={t('admin.groupName')} error={requiredText(newNameMissing, t)}>
                    <input value={newName} required onChange={(event) => {
                        setNewName(event.target.value);
                        setNewNameMissing(false);
                    }}/>
                </FormField>
                <FormField id="group-description" label={`${t('admin.groupDescription')} ${t('forms.optionalSuffix')}`}>
                    <input value={newDescription} onChange={(event) => setNewDescription(event.target.value)}/>
                </FormField>
                <button className="primary-button" type="submit" aria-busy={busy} disabled={busy}>{busy && <span className="button-spinner" aria-hidden="true"/>}{t('admin.createGroup')}</button>
            </div>
        </form>
        {error && <p className="form-error" role="alert">{t(error.messageKey)}</p>}
        {busy && <p className="form-status" role="status">{t(busyMessage)}</p>}
        {groups.length === 0 && <RouteState status="empty"/>}
        {groups.length !== 0 && <>
            <div className="group-list" role="list">{groups.map((group) => {
                let className = 'group-choice';
                if (group.id === activeGroup?.id) className += ' active';
                return <button className={className} key={group.id} type="button"
                               onClick={() => onSelectGroup(group.id)}>{groupName(group, t)}{group.kind === 'members' && <ManagedBadge/>}</button>;
            })}</div>
            {activeGroup?.kind === 'members' && <MembersGroupDetail groupTemplatesQuery={groupTemplatesQuery}/>}
            {activeGroup && activeGroup.kind !== 'members' && <>
                <div className="catalog-actions">
                    <form className="catalog-form-row group-rename-form" onSubmit={renameGroup} noValidate>
                        <FormField id="group-rename" label={t('admin.renameGroup')} error={requiredText(renameMissing, t)}>
                            <input value={renameValue} required onChange={(event) => {
                                setRenameValue(event.target.value);
                                setRenameMissing(false);
                            }}/>
                        </FormField>
                        <button className="secondary-button" type="submit" disabled={busy}>{t('forms.submit')}</button>
                    </form>
                    <div className="action-group-danger">
                        <button className="secondary-button destructive-button" type="button" disabled={busy} onClick={() => {
                            void deleteGroup();
                        }}><TrashIcon/>{t('admin.delete')}</button>
                    </div>
                </div>
                <QueryState query={groupTemplatesQuery}>{() => <>
                    <h2>{t('admin.memberships')}</h2>
                    <div className="catalog-form-row catalog-membership-form">
                        <div className="catalog-membership-toolbar">
                            <FormField id="group-template-filter" label={t('admin.filterTemplates')} hint={t('admin.filterHint')}>
                                <input value={templateFilter} placeholder={t('admin.filterTemplatesPlaceholder')}
                                       onChange={(event) => changeTemplateFilter(event.target.value)} disabled={busy}/>
                            </FormField>
                            <button className="text-button" type="button"
                                    disabled={busy || visibleTemplates.length === 0}
                                    onClick={() => void toggleVisibleTemplates()}>
                                {allVisibleTemplatesSelected && t('admin.removeVisibleTemplates')}
                                {!allVisibleTemplatesSelected && t('admin.addVisibleTemplates')}
                            </button>
                        </div>
                        <fieldset disabled={busy || visibleTemplates.length === 0} className="catalog-membership-options">
                            <legend>{t('admin.allTemplates')}</legend>
                            {visibleTemplates.map((template) => <label key={template.id}>
                                <input type="checkbox" checked={membershipIds.has(template.id)}
                                       aria-label={`${t('admin.selectTemplate')} ${template.name}`}
                                       onChange={(event) => void toggleMembership(template.id, event.target.checked)}/>
                                {template.name}
                            </label>)}
                        </fieldset>
                    </div>
                    {visibleTemplates.length === 0 && <RouteState status="empty"/>}
                </>}</QueryState>
            </>}
        </>}
    </section>;
}

function requiredText(missing: boolean, t: (key: 'forms.requiredField') => string) {
    if (missing) return t('forms.requiredField');
    return null;
}

function ManagedBadge() {
    const {t} = useI18n();
    return <span className="managed-badge">{t('admin.managedBadge')}</span>;
}

function MembersGroupDetail({groupTemplatesQuery}: {
    groupTemplatesQuery: ReturnType<typeof catalogQueries.useCatalogGroupTemplates>
}) {
    const {t} = useI18n();
    return <>
        <p className="form-status">{t('admin.membersGroupHint')}</p>
        <QueryState query={groupTemplatesQuery}>{(members) => <>
            <h2>{t('admin.memberships')}</h2>
            {members.length === 0 && <RouteState status="empty"/>}
            {members.length !== 0 && <ul className="data-list catalog-list">{members.map((member) =>
                <li key={member.id}>{member.name}</li>)}</ul>}
        </>}</QueryState>
    </>;
}

export function groupName(group: CatalogGroup, t: (key: 'admin.membersGroupName') => string) {
    if (group.kind === 'members') return t('admin.membersGroupName');
    return group.name;
}

function frontendError(cause: unknown) {
    if (cause instanceof ApiError) return cause.frontend;
    return null;
}

function withMembership(current: Set<string>, templateId: string, checked: boolean) {
    const next = new Set(current);
    if (checked) next.add(templateId);
    else next.delete(templateId);
    return next;
}

function matchesGlob(value: string, pattern: string) {
    if (!pattern) return true;
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^${escaped.replace(/\*/g, '.*').replace(/\?/g, '.')}$`, 'i').test(value);
}

import {type FormEvent, useEffect, useState} from 'react';
import {ApiError, type FrontendError} from '../../shared/api/errors';
import {useI18n} from '../../shared/i18n/I18nProvider';
import {QueryState} from '../../shared/ui/QueryState';
import {RouteState} from '../../shared/ui/RouteState';
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
type AssignmentResult = { assigned: string[]; failed: FailedEntry[] };
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
    const [batchInput, setBatchInput] = useState('');
    const [renameId, setRenameId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [busy, setBusy] = useState(false);
    const [busyMessage, setBusyMessage] = useState<BusyMessage>('common.saving');
    const [error, setError] = useState<FrontendError | null>(null);
    const [batchResult, setBatchResult] = useState<BatchResult | null>(null);
    const [deleteResult, setDeleteResult] = useState<DeleteResult | null>(null);

    const normalizedSearch = normalizeName(search);
    const filtered = templates.filter((template) => normalizeName(template.name).includes(normalizedSearch));
    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(page, pageCount - 1);
    const visible = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
    const visibleIds = visible.map((template) => template.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

    useEffect(() => {
        const existingIds = new Set(templates.map((template) => template.id));
        setSelected((current) => {
            const next = new Set([...current].filter((id) => existingIds.has(id)));
            return next.size === current.size ? current : next;
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
        if (!name) return;
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
                skipped: result.skipped.map((entry) => entry.kind === 'empty' ? t('admin.emptyBatchValue') : entry.name),
                failed,
            });
            setBatchInput(failed.length === 0 ? '' : failed.map((entry) => entry.name).join(', '));
        } catch (cause) {
            setError(frontendError(cause));
        } finally {
            setBusy(false);
        }
    }

    function beginRename(template: CatalogTemplate) {
        setRenameId(template.id);
        setRenameValue(template.name);
        setError(null);
    }

    async function renameTemplate(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!renameId) return;
        const name = normalizeName(renameValue);
        if (!name) return;
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
        if (!toDelete.length || !window.confirm(t('admin.confirmDeleteTemplates'))) return;
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
        <h3>{t('admin.templates')}</h3>
        <form className="catalog-form" onSubmit={createTemplate}>
            <label htmlFor="template-name">{t('admin.newTemplate')}</label>
            <div className="catalog-form-row"><input id="template-name" value={newName}
                                                     onChange={(event) => setNewName(event.target.value)} required/>
                <button className="primary-button" type="submit" disabled={busy}>{t('admin.createTemplate')}</button>
            </div>
        </form>
        <form className="catalog-form" onSubmit={importTemplates}>
            <label htmlFor="template-batch">{t('admin.batchTemplates')}</label>
            <textarea id="template-batch" value={batchInput} onChange={(event) => setBatchInput(event.target.value)}
                      placeholder={t('admin.batchPlaceholder')} rows={3}/>
            <button className="secondary-button" type="submit" disabled={busy}>{t('admin.importTemplates')}</button>
        </form>
        <label htmlFor="template-search">{t('admin.searchTemplates')}</label>
        <input id="template-search" value={search} onChange={(event) => {
            setSearch(event.target.value);
            setPage(0);
        }}/>
        <div className="catalog-actions"><label><input type="checkbox" checked={allVisibleSelected}
                                                       onChange={toggleVisibleSelection}/> {t('admin.selectVisible')}
        </label>
            <button className="text-button destructive-button" type="button" disabled={busy || selected.size === 0}
                    onClick={() => {
                        void deleteTemplates(templates.filter((template) => selected.has(template.id)));
                    }}>{t('admin.deleteSelected')} ({selected.size})
            </button>
        </div>
        {error && <p className="form-error" role="alert">{t(error.messageKey)}</p>}
        {busy && <p className="form-status" role="status">{t(busyMessage)}</p>}
        {batchResult && <BatchResultView result={batchResult}/>}
        {deleteResult && <DeleteResultView result={deleteResult}/>}
        {visible.length === 0 ? <RouteState status="empty"/> :
            <ul className="data-list catalog-list">{visible.map((template) => <li key={template.id}>
                <label><input type="checkbox" checked={selected.has(template.id)}
                              onChange={() => toggleSelection(template.id)}
                              aria-label={`${t('admin.selectTemplate')} ${template.name}`}/>
                    <strong>{template.name}</strong></label>
                <div className="catalog-item-actions">{renameId === template.id ?
                    <form onSubmit={renameTemplate}><input aria-label={`${t('admin.renameTemplate')} ${template.name}`}
                                                           value={renameValue}
                                                           onChange={(event) => setRenameValue(event.target.value)}
                                                           required/>
                        <button className="text-button" type="submit" disabled={busy}>{t('forms.submit')}</button>
                        <button className="text-button" type="button"
                                onClick={() => setRenameId(null)}>{t('forms.cancel')}</button>
                    </form> : <button className="text-button" type="button"
                                      onClick={() => beginRename(template)}>{t('admin.rename')}</button>}
                    <button className="text-button destructive-button" type="button" disabled={busy} onClick={() => {
                        void deleteTemplates([template]);
                    }}>{t('admin.delete')}</button>
                </div>
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

function AssignmentResultView({result}: { result: AssignmentResult }) {
    const {t} = useI18n();
    return <div className="catalog-result" role="status">
        <strong>{t('admin.assignmentSummary')}</strong><span>{t('admin.assigned')}: {result.assigned.length} ({result.assigned.join(', ')})</span><span>{t('admin.failed')}: {result.failed.length}</span>{result.failed.map((entry) =>
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
    const [newDescription, setNewDescription] = useState('');
    const [renameValue, setRenameValue] = useState('');
    const [busy, setBusy] = useState(false);
    const [busyMessage, setBusyMessage] = useState<BusyMessage>('common.saving');
    const [error, setError] = useState<FrontendError | null>(null);
    const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set());
    const [assignmentResult, setAssignmentResult] = useState<AssignmentResult | null>(null);

    useEffect(() => {
        setRenameValue(activeGroup?.name ?? '');
    }, [activeGroup?.id, activeGroup?.name]);

    useEffect(() => {
        setSelectedTemplateIds(new Set());
        setAssignmentResult(null);
    }, [activeGroup?.id]);

    async function createGroup(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const name = normalizeName(newName);
        if (!name) return;
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
        if (!name) return;
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
        if (!activeGroup || !window.confirm(t('admin.confirmDeleteGroup'))) return;
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

    async function assignTemplates(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!activeGroup) return;
        const selectedTemplates = availableTemplates.filter((template) => selectedTemplateIds.has(template.id));
        if (selectedTemplates.length === 0) return;
        setBusy(true);
        setBusyMessage('common.processing');
        setError(null);
        try {
            const result = await catalogCommands.assignTemplatesToGroup(activeGroup.id, selectedTemplates);
            setAssignmentResult({
                assigned: result.assigned.map((template) => template.name),
                failed: result.failed.map((entry) => ({name: entry.name, error: frontendError(entry.error)})),
            });
            setSelectedTemplateIds(new Set(result.failed.map((entry) => entry.id)));
        } catch (cause) {
            setError(frontendError(cause));
        } finally {
            setBusy(false);
        }
    }

    async function removeMembership(templateId: string) {
        if (!activeGroup) return;
        setBusy(true);
        setBusyMessage('common.processing');
        setError(null);
        try {
            await catalogCommands.removeTemplateFromGroup(activeGroup.id, templateId);
        } catch (cause) {
            setError(frontendError(cause));
        } finally {
            setBusy(false);
        }
    }

    const members = groupTemplatesQuery.data ?? [];
    const memberIds = new Set(members.map((template) => template.id));
    const availableTemplates = templates.filter((template) => !memberIds.has(template.id));

    return <section className="admin-panel">
        <h3>{t('admin.groups')}</h3>
        <form className="catalog-form" onSubmit={createGroup}><label htmlFor="group-name">{t('admin.newGroup')}</label>
            <div className="catalog-form-row"><input id="group-name" value={newName}
                                                     onChange={(event) => setNewName(event.target.value)}
                                                     required/><input aria-label={t('admin.groupDescription')}
                                                                      value={newDescription}
                                                                      onChange={(event) => setNewDescription(event.target.value)}
                                                                      placeholder={t('admin.groupDescription')}/>
                <button className="primary-button" type="submit" disabled={busy}>{t('admin.createGroup')}</button>
            </div>
        </form>
        {error && <p className="form-error" role="alert">{t(error.messageKey)}</p>}
        {busy && <p className="form-status" role="status">{t(busyMessage)}</p>}
        {groups.length === 0 ? <RouteState status="empty"/> : <>
            <div className="group-list" role="list">{groups.map((group) => <button
                className={`group-choice${group.id === activeGroup?.id ? ' active' : ''}`} key={group.id} type="button"
                onClick={() => onSelectGroup(group.id)}>{group.name}</button>)}</div>
            {activeGroup && <>
                <div className="catalog-actions">
                    <form onSubmit={renameGroup}><label htmlFor="group-rename">{t('admin.renameGroup')}</label><input
                        id="group-rename" value={renameValue || activeGroup.name}
                        onChange={(event) => setRenameValue(event.target.value)} required/>
                        <button className="text-button" type="submit" disabled={busy}>{t('forms.submit')}</button>
                    </form>
                    <button className="text-button destructive-button" type="button" disabled={busy} onClick={() => {
                        void deleteGroup();
                    }}>{t('admin.delete')}</button>
                </div>
                <QueryState query={groupTemplatesQuery}>{(memberships) => <>
                    <h4>{t('admin.memberships')}</h4>
                    <form className="catalog-form-row" onSubmit={assignTemplates}>
                        <fieldset disabled={busy || availableTemplates.length === 0}>
                            <legend>{t('admin.addMembership')}</legend>
                            {availableTemplates.map((template) => <label key={template.id}>
                                <input type="checkbox" checked={selectedTemplateIds.has(template.id)}
                                       aria-label={`${t('admin.selectTemplate')} ${template.name}`}
                                       onChange={() => setSelectedTemplateIds((current) => {
                                           const next = new Set(current);
                                           if (next.has(template.id)) next.delete(template.id);
                                           else next.add(template.id);
                                           return next;
                                       })}/>
                                {template.name}
                            </label>)}
                        </fieldset>
                        <button className="secondary-button" type="submit"
                                disabled={busy || selectedTemplateIds.size === 0}>{t('admin.add')}</button>
                    </form>
                    {assignmentResult && <AssignmentResultView result={assignmentResult}/>}
                    {memberships.length === 0 ? <RouteState status="empty"/> :
                        <ul className="data-list catalog-list">{memberships.map((template) => <li key={template.id}>
                            <strong>{template.name}</strong>
                            <button className="text-button" type="button" disabled={busy} onClick={() => {
                                void removeMembership(template.id);
                            }}>{t('admin.removeMembership')}</button>
                        </li>)}</ul>}
                </>}</QueryState>
            </>}
        </>}
    </section>;
}

function frontendError(cause: unknown) {
    return cause instanceof ApiError ? cause.frontend : null;
}

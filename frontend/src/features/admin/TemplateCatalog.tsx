import { useEffect, useState, type FormEvent } from 'react';
import { apiClient } from '../../shared/api/client';
import { ApiError, type FrontendError } from '../../shared/api/errors';
import { queryClient } from '../../shared/api/queryClient';
import { queryKeys } from '../../shared/api/queryKeys';
import { useApiQuery } from '../../shared/api/useApiQuery';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { QueryState } from '../../shared/ui/QueryState';
import { RouteState } from '../../shared/ui/RouteState';

type CatalogTemplate = { id: string; name: string };
type CatalogGroup = { id: string; name: string; description: string };
type FailedEntry = { name: string; error: FrontendError | null };
type BatchResult = { created: string[]; skipped: string[]; failed: FailedEntry[] };
type DeleteResult = { deleted: string[]; failed: FailedEntry[] };

// Keep batch traffic bounded while allowing independent requests to continue.
const BATCH_CONCURRENCY = 3;
const PAGE_SIZE = 20;

export function TemplateCatalogTemplates() {
  const query = useApiQuery(queryKeys.templates, () => apiClient.getTemplates());
  return <QueryState query={query}>{(templates) => <TemplateManager templates={templates} />}</QueryState>;
}

function TemplateManager({ templates }: { templates: CatalogTemplate[] }) {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newName, setNewName] = useState('');
  const [batchInput, setBatchInput] = useState('');
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [busy, setBusy] = useState(false);
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

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.templates }),
      queryClient.invalidateQueries({ queryKey: queryKeys.groups }),
    ]);
  }

  async function createTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = normalizeName(newName);
    if (!name) return;
    setBusy(true);
    setError(null);
    setBatchResult(null);
    try {
      await apiClient.createTemplate(name);
      setNewName('');
      await refresh();
    } catch (cause) {
      setError(frontendError(cause));
    } finally {
      setBusy(false);
    }
  }

  async function importTemplates(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setDeleteResult(null);
    const existingNames = new Set(templates.map((template) => normalizeName(template.name)));
    const seenNames = new Set<string>();
    const skipped: string[] = [];
    const candidates: string[] = [];

    for (const rawValue of batchInput.split(',')) {
      const name = normalizeName(rawValue);
      if (!name) skipped.push(t('admin.emptyBatchValue'));
      else if (seenNames.has(name) || existingNames.has(name)) skipped.push(name);
      else {
        seenNames.add(name);
        candidates.push(name);
      }
    }

    const created: string[] = [];
    const failed: FailedEntry[] = [];
    await runWithConcurrency(candidates, BATCH_CONCURRENCY, async (name) => {
      try {
        await apiClient.createTemplate(name);
        created.push(name);
      } catch (cause) {
        failed.push({ name, error: frontendError(cause) });
      }
    });
    setBatchResult({ created, skipped, failed });
    setBatchInput('');
    try {
      await refresh();
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
    setError(null);
    try {
      await apiClient.renameTemplate(renameId, name);
      setRenameId(null);
      await refresh();
    } catch (cause) {
      setError(frontendError(cause));
    } finally {
      setBusy(false);
    }
  }

  async function deleteTemplates(toDelete: CatalogTemplate[]) {
    if (!toDelete.length || !window.confirm(t('admin.confirmDeleteTemplates'))) return;
    setBusy(true);
    setError(null);
    setBatchResult(null);
    const deleted: string[] = [];
    const deletedIds: string[] = [];
    const failed: FailedEntry[] = [];
    await runWithConcurrency(toDelete, BATCH_CONCURRENCY, async (template) => {
      try {
        await apiClient.deleteTemplate(template.id);
        deleted.push(template.name);
        deletedIds.push(template.id);
      } catch (cause) {
        failed.push({ name: template.name, error: frontendError(cause) });
      }
    });
    setSelected((current) => new Set([...current].filter((id) => !deletedIds.includes(id))));
    setDeleteResult({ deleted, failed });
    try {
      await refresh();
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
      <div className="catalog-form-row"><input id="template-name" value={newName} onChange={(event) => setNewName(event.target.value)} required /><button className="primary-button" type="submit" disabled={busy}>{t('admin.createTemplate')}</button></div>
    </form>
    <form className="catalog-form" onSubmit={importTemplates}>
      <label htmlFor="template-batch">{t('admin.batchTemplates')}</label>
      <textarea id="template-batch" value={batchInput} onChange={(event) => setBatchInput(event.target.value)} placeholder={t('admin.batchPlaceholder')} rows={3} />
      <button className="secondary-button" type="submit" disabled={busy}>{t('admin.importTemplates')}</button>
    </form>
    <label htmlFor="template-search">{t('admin.searchTemplates')}</label>
    <input id="template-search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} />
    <div className="catalog-actions"><label><input type="checkbox" checked={allVisibleSelected} onChange={toggleVisibleSelection} /> {t('admin.selectVisible')}</label><button className="text-button destructive-button" type="button" disabled={busy || selected.size === 0} onClick={() => { void deleteTemplates(templates.filter((template) => selected.has(template.id))); }}>{t('admin.deleteSelected')} ({selected.size})</button></div>
    {error && <p className="form-error" role="alert">{t(error.messageKey)}</p>}
    {batchResult && <BatchResultView result={batchResult} />}
    {deleteResult && <DeleteResultView result={deleteResult} />}
    {visible.length === 0 ? <RouteState status="empty" /> : <ul className="data-list catalog-list">{visible.map((template) => <li key={template.id}>
      <label><input type="checkbox" checked={selected.has(template.id)} onChange={() => toggleSelection(template.id)} aria-label={`${t('admin.selectTemplate')} ${template.name}`} /> <strong>{template.name}</strong></label>
      <div className="catalog-item-actions">{renameId === template.id ? <form onSubmit={renameTemplate}><input aria-label={`${t('admin.renameTemplate')} ${template.name}`} value={renameValue} onChange={(event) => setRenameValue(event.target.value)} required /><button className="text-button" type="submit" disabled={busy}>{t('forms.submit')}</button><button className="text-button" type="button" onClick={() => setRenameId(null)}>{t('forms.cancel')}</button></form> : <button className="text-button" type="button" onClick={() => beginRename(template)}>{t('admin.rename')}</button>}<button className="text-button destructive-button" type="button" disabled={busy} onClick={() => { void deleteTemplates([template]); }}>{t('admin.delete')}</button></div>
    </li>)}</ul>}
    <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
  </section>;
}

function BatchResultView({ result }: { result: BatchResult }) {
  const { t } = useI18n();
  return <div className="catalog-result" role="status"><strong>{t('admin.batchSummary')}</strong><span>{t('admin.created')}: {result.created.length} ({result.created.join(', ')})</span><span>{t('admin.skipped')}: {result.skipped.length} ({result.skipped.join(', ')})</span><span>{t('admin.failed')}: {result.failed.length}</span>{result.failed.map((entry) => <span key={entry.name}>{entry.name}: {t(entry.error?.messageKey ?? 'errors.generic')}</span>)}</div>;
}

function DeleteResultView({ result }: { result: DeleteResult }) {
  const { t } = useI18n();
  return <div className="catalog-result" role="status"><strong>{t('admin.deleteSummary')}</strong><span>{t('admin.deleted')}: {result.deleted.length}</span><span>{t('admin.failed')}: {result.failed.length}</span>{result.failed.map((entry) => <span key={entry.name}>{entry.name}: {t(entry.error?.messageKey ?? 'errors.generic')}</span>)}</div>;
}

function Pagination({ page, pageCount, onPageChange }: { page: number; pageCount: number; onPageChange: (page: number) => void }) {
  const { t } = useI18n();
  if (pageCount < 2) return null;
  return <nav className="catalog-pagination" aria-label={t('admin.pagination')}><button className="text-button" type="button" disabled={page === 0} onClick={() => onPageChange(page - 1)}>{t('admin.previous')}</button><span>{page + 1} / {pageCount}</span><button className="text-button" type="button" disabled={page === pageCount - 1} onClick={() => onPageChange(page + 1)}>{t('admin.next')}</button></nav>;
}

export function TemplateCatalogGroups() {
  const groupsQuery = useApiQuery(queryKeys.groups, () => apiClient.getGroups());
  const templatesQuery = useApiQuery(queryKeys.templates, () => apiClient.getTemplates());
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const groups = groupsQuery.data ?? [];
  const activeGroup = groups.find((group) => group.id === activeGroupId) ?? groups[0];
  const groupTemplatesQuery = useApiQuery(queryKeys.groupTemplates(activeGroup?.id ?? ''), () => apiClient.getTemplatesInGroup(activeGroup?.id ?? ''), { enabled: Boolean(activeGroup) });

  useEffect(() => {
    if (!activeGroup || !groups.some((group) => group.id === activeGroupId)) setActiveGroupId(groups[0]?.id ?? null);
  }, [activeGroup, activeGroupId, groups]);

  return <QueryState query={groupsQuery}>{(loadedGroups) => <QueryState query={templatesQuery}>{(templates) => <GroupManager groups={loadedGroups} templates={templates} activeGroup={activeGroup} groupTemplatesQuery={groupTemplatesQuery} onSelectGroup={setActiveGroupId} />}</QueryState>}</QueryState>;
}

function GroupManager({ groups, templates, activeGroup, groupTemplatesQuery, onSelectGroup }: { groups: CatalogGroup[]; templates: CatalogTemplate[]; activeGroup?: CatalogGroup; groupTemplatesQuery: ReturnType<typeof useApiQuery<CatalogTemplate[]>>; onSelectGroup: (id: string) => void }) {
  const { t } = useI18n();
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [assignId, setAssignId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<FrontendError | null>(null);

  useEffect(() => {
    setRenameValue(activeGroup?.name ?? '');
  }, [activeGroup?.id, activeGroup?.name]);

  async function refreshGroups() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.groups });
  }

  async function createGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = normalizeName(newName);
    if (!name) return;
    setBusy(true);
    setError(null);
    try {
      const created = await apiClient.createGroup({ name, description: newDescription.trim() });
      setNewName('');
      setNewDescription('');
      await refreshGroups();
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
    setError(null);
    try {
      await apiClient.renameGroup(activeGroup.id, name);
      await refreshGroups();
    } catch (cause) {
      setError(frontendError(cause));
    } finally {
      setBusy(false);
    }
  }

  async function deleteGroup() {
    if (!activeGroup || !window.confirm(t('admin.confirmDeleteGroup'))) return;
    setBusy(true);
    setError(null);
    try {
      await apiClient.deleteGroup(activeGroup.id);
      queryClient.removeQueries({ queryKey: queryKeys.groupTemplates(activeGroup.id) });
      await refreshGroups();
    } catch (cause) {
      setError(frontendError(cause));
    } finally {
      setBusy(false);
    }
  }

  async function assignTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeGroup || !assignId) return;
    setBusy(true);
    setError(null);
    try {
      await apiClient.assignTemplateToGroup(activeGroup.id, assignId);
      setAssignId('');
      await queryClient.invalidateQueries({ queryKey: queryKeys.groupTemplates(activeGroup.id) });
    } catch (cause) {
      setError(frontendError(cause));
    } finally {
      setBusy(false);
    }
  }

  async function removeMembership(templateId: string) {
    if (!activeGroup) return;
    setBusy(true);
    setError(null);
    try {
      await apiClient.removeTemplateFromGroup(activeGroup.id, templateId);
      await queryClient.invalidateQueries({ queryKey: queryKeys.groupTemplates(activeGroup.id) });
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
    <form className="catalog-form" onSubmit={createGroup}><label htmlFor="group-name">{t('admin.newGroup')}</label><div className="catalog-form-row"><input id="group-name" value={newName} onChange={(event) => setNewName(event.target.value)} required /><input aria-label={t('admin.groupDescription')} value={newDescription} onChange={(event) => setNewDescription(event.target.value)} placeholder={t('admin.groupDescription')} /><button className="primary-button" type="submit" disabled={busy}>{t('admin.createGroup')}</button></div></form>
    {error && <p className="form-error" role="alert">{t(error.messageKey)}</p>}
    {groups.length === 0 ? <RouteState status="empty" /> : <>
      <div className="group-list" role="list">{groups.map((group) => <button className={`group-choice${group.id === activeGroup?.id ? ' active' : ''}`} key={group.id} type="button" onClick={() => onSelectGroup(group.id)}>{group.name}</button>)}</div>
      {activeGroup && <>
        <div className="catalog-actions"><form onSubmit={renameGroup}><label htmlFor="group-rename">{t('admin.renameGroup')}</label><input id="group-rename" value={renameValue || activeGroup.name} onChange={(event) => setRenameValue(event.target.value)} required /><button className="text-button" type="submit" disabled={busy}>{t('forms.submit')}</button></form><button className="text-button destructive-button" type="button" disabled={busy} onClick={() => { void deleteGroup(); }}>{t('admin.delete')}</button></div>
        <QueryState query={groupTemplatesQuery}>{(memberships) => <>
          <h4>{t('admin.memberships')}</h4>
          <form className="catalog-form-row" onSubmit={assignTemplate}><label htmlFor="assign-template">{t('admin.addMembership')}</label><select id="assign-template" value={assignId} onChange={(event) => setAssignId(event.target.value)} required><option value="">{t('admin.selectTemplate')}</option>{availableTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select><button className="secondary-button" type="submit" disabled={busy || availableTemplates.length === 0}>{t('admin.add')}</button></form>
          {memberships.length === 0 ? <RouteState status="empty" /> : <ul className="data-list catalog-list">{memberships.map((template) => <li key={template.id}><strong>{template.name}</strong><button className="text-button" type="button" disabled={busy} onClick={() => { void removeMembership(template.id); }}>{t('admin.removeMembership')}</button></li>)}</ul>}
        </>}</QueryState>
      </>}
    </>}
  </section>;
}

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

function frontendError(cause: unknown) {
  return cause instanceof ApiError ? cause.frontend : null;
}

async function runWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let nextIndex = 0;
  async function consume() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, consume));
}

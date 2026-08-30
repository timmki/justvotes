import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/client';
import { ApiError, type FrontendError } from '../../shared/api/errors';
import { queryClient } from '../../shared/api/queryClient';
import { queryKeys } from '../../shared/api/queryKeys';
import { useApiQuery } from '../../shared/api/useApiQuery';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { ChevronRightIcon } from '../../shared/ui/Icons';
import { PageFrame } from '../../shared/ui/PageFrame';
import { QueryState } from '../../shared/ui/QueryState';

export function HomePage() {
  const { t } = useI18n();
  const identityQuery = useApiQuery(queryKeys.identity, () => apiClient.getIdentity());
  return <PageFrame eyebrow="JustVotes" title={t('common.home')} description={t('common.homeDescription')}><QueryState query={identityQuery}>{(identity) => <IdentityCard identity={identity.userID} />}</QueryState><nav className="primary-navigation" aria-label={t('common.mainNavigation')}><Link className="action-card" to="/polls"><span><strong>{t('common.polls')}</strong><small>{t('common.publicArea')}</small></span><ChevronRightIcon /></Link><Link className="action-card secondary" to="/admin"><span><strong>{t('common.admin')}</strong><small>{t('common.adminArea')}</small></span><ChevronRightIcon /></Link></nav></PageFrame>;
}

function IdentityCard({ identity }: { identity: string | null }) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [validationError, setValidationError] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [serverError, setServerError] = useState<FrontendError | null>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(false);
  const mutation = useMutation({
    mutationFn: (userID: string) => apiClient.changeIdentity({ userID }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.identity }),
        queryClient.invalidateQueries({ queryKey: queryKeys.publicPolls }),
        queryClient.invalidateQueries({ queryKey: ['poll'] }),
      ]);
      setEditing(false);
      setConfirmOpen(false);
      setServerError(null);
    },
    onError: (cause) => {
      setConfirmOpen(false);
      saveButtonRef.current?.focus();
      setServerError(cause instanceof ApiError ? cause.frontend : null);
    },
  });

  useEffect(() => {
    if (!editing) setDraft(identity ?? '');
  }, [editing, identity]);

  useEffect(() => {
    if (!editing && wasEditing.current) editButtonRef.current?.focus();
    wasEditing.current = editing;
  }, [editing]);

  function startEditing() {
    setDraft(identity ?? '');
    setValidationError(false);
    setServerError(null);
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setValidationError(false);
    setServerError(null);
  }

  function requestSave() {
    const normalized = normalizeIdentity(draft);
    if (!identityPattern.test(normalized)) {
      setValidationError(true);
      return;
    }
    if (normalized === identity) {
      cancelEditing();
      return;
    }
    setValidationError(false);
    setServerError(null);
    setConfirmOpen(true);
  }

  return <section className="identity-card" aria-labelledby="identity-heading">
    <p className="eyebrow">{t('common.identity')}</p>
    {!editing ? <><h2 id="identity-heading">{identity ? <span aria-label={identity} title={identity}>{displayIdentity(identity)}</span> : t('common.identityNotSet')}</h2><p>{t('common.identityNote')}</p><button ref={editButtonRef} className="text-button" type="button" onClick={startEditing}>{t('common.identityEdit')}</button></> : <>
      <h2 id="identity-heading">{t('common.identityEdit')}</h2>
      {identity && <p className="confirmed-identity">{t('common.identity')}: <span title={identity}>{displayIdentity(identity)}</span></p>}
      <label htmlFor="identity-input">{t('common.identityInput')}</label>
      <input id="identity-input" value={draft} onChange={(event) => { setDraft(event.target.value); setValidationError(false); setServerError(null); }} autoComplete="off" />
      {validationError && <p className="form-error" role="alert">{t('common.identityValidation')}</p>}
      {serverError && <p className="form-error" role="alert">{t(serverError.messageKey)}</p>}
      <div className="identity-actions"><button ref={saveButtonRef} className="primary-button" type="button" onClick={requestSave} disabled={mutation.isPending}>{t('forms.submit')}</button><button className="text-button" type="button" onClick={cancelEditing} disabled={mutation.isPending}>{t('forms.cancel')}</button></div>
    </>}
    {confirmOpen && <IdentityConfirmation onCancel={() => { setConfirmOpen(false); saveButtonRef.current?.focus(); }} onConfirm={() => mutation.mutate(normalizeIdentity(draft))} pending={mutation.isPending} />}
  </section>;
}

function IdentityConfirmation({ onCancel, onConfirm, pending }: { onCancel: () => void; onConfirm: () => void; pending: boolean }) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled])'));
    focusable()[0]?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); onCancel(); return; }
      if (event.key !== 'Tab') return;
      const controls = focusable();
      if (controls.length === 0) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return <div className="modal-backdrop"><div ref={dialogRef} className="identity-dialog" role="dialog" aria-modal="true" aria-labelledby="identity-dialog-heading" aria-describedby="identity-dialog-warning"><h3 id="identity-dialog-heading">{t('common.identityChangeTitle')}</h3><p id="identity-dialog-warning">{t('common.identityChangeWarning')}</p><div className="identity-actions"><button className="primary-button" type="button" onClick={onConfirm} disabled={pending}>{t('common.identityChangeConfirm')}</button><button className="text-button" type="button" onClick={onCancel} disabled={pending}>{t('forms.cancel')}</button></div></div></div>;
}

const identityPattern = /^[a-z0-9_-]{3,32}$/;

function normalizeIdentity(value: string) { return value.trim().toLowerCase(); }

function displayIdentity(identity: string) { return identity.length > 8 ? `${identity.slice(0, 8)}…` : identity; }

export function NotFoundPage() {
  const { t } = useI18n();
  return <PageFrame eyebrow="404" title={t('errors.notFound')} description={t('errors.notFoundText')}><Link className="primary-button" to="/">{t('common.home')}</Link></PageFrame>;
}

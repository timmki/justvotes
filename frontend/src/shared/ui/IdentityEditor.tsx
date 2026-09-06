import {useMutation} from '@tanstack/react-query';
import {useEffect, useId, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {apiClient} from '../api/client';
import {ApiError, type FrontendError} from '../api/errors';
import {queryClient} from '../api/queryClient';
import {queryKeys} from '../api/queryKeys';
import {useI18n} from '../i18n/I18nProvider';
import {useDialogFocusTrap} from './useDialogFocusTrap';

type IdentityEditorProps = {
    identity: string | null;
    variant?: 'card' | 'compact';
    identityState?: 'ready' | 'loading' | 'error';
};

export function IdentityEditor({identity, variant = 'card', identityState = 'ready'}: IdentityEditorProps) {
    const {t} = useI18n();
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState('');
    const [validationError, setValidationError] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [serverError, setServerError] = useState<FrontendError | null>(null);
    const editButtonRef = useRef<HTMLButtonElement>(null);
    const saveButtonRef = useRef<HTMLButtonElement>(null);
    const wasEditing = useRef(false);
    const headingId = useId();
    const inputId = useId();
    const mutation = useMutation({
        mutationFn: (userID: string) => apiClient.changeIdentity({userID}),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({queryKey: queryKeys.identity}),
                queryClient.invalidateQueries({queryKey: queryKeys.publicPolls}),
                queryClient.invalidateQueries({queryKey: ['poll']}),
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
        if (!isValidIdentity(draft)) {
            setValidationError(true);
            return;
        }
        if (draft === identity) {
            cancelEditing();
            return;
        }
        setValidationError(false);
        setServerError(null);
        setConfirmOpen(true);
    }

    const compact = variant === 'compact';
    const identityLabel = identity ? <span aria-label={identity} title={identity}>{displayIdentity(identity)}</span> :
        identityState === 'ready' ? t('common.identityNotSet') : t('common.identityNotLoaded');
    return <section className={`${compact ? 'identity-mini identity-shell-editor' : 'identity-card'}${editing ? ' is-editing' : ''}`}
                    data-identity-editor aria-labelledby={headingId}>
        <p className="eyebrow">{t('common.identity')}</p>
        {!editing ? <>
            <h2 id={headingId}>{identityLabel}</h2>
            {!compact && <p>{t('common.identityNote')}</p>}
            <button ref={editButtonRef} className={compact ? 'identity-edit-button' : 'text-button'} type="button"
                    onClick={startEditing} disabled={identityState === 'error'}>{t('common.identityEdit')}</button>
        </> : <>
            <h2 id={headingId}>{t('common.identityEdit')}</h2>
            {identity && <p className="confirmed-identity">{t('common.identity')}: <span title={identity}>{displayIdentity(identity)}</span></p>}
            <label htmlFor={inputId}>{t('common.identityInput')}</label>
            <input id={inputId} value={draft} onChange={(event) => {
                setDraft(event.target.value);
                setValidationError(false);
                setServerError(null);
            }} autoComplete="off"/>
            {validationError && <p className="form-error" role="alert">{t('common.identityValidation')}</p>}
            {serverError && <p className="form-error" role="alert">{t(serverError.messageKey)}</p>}
            <div className="identity-actions">
                <button ref={saveButtonRef} className="primary-button" type="button" onClick={requestSave}
                        disabled={mutation.isPending}>{t('forms.submit')}</button>
                <button className="text-button" type="button" onClick={cancelEditing}
                        disabled={mutation.isPending}>{t('forms.cancel')}</button>
            </div>
        </>}
        {confirmOpen && <IdentityConfirmation
            onCancel={() => {
                setConfirmOpen(false);
                saveButtonRef.current?.focus();
            }}
            onConfirm={() => mutation.mutate(draft)}
            pending={mutation.isPending}/>
        }
    </section>;
}

function IdentityConfirmation({onCancel, onConfirm, pending}: {
    onCancel: () => void;
    onConfirm: () => void;
    pending: boolean;
}) {
    const {t} = useI18n();
    const dialogRef = useRef<HTMLDivElement>(null);
    useDialogFocusTrap(dialogRef, onCancel);

    return createPortal(<div className="modal-backdrop">
        <div ref={dialogRef} className="identity-dialog" role="dialog" aria-modal="true" tabIndex={-1}
             aria-labelledby="identity-dialog-heading" aria-describedby="identity-dialog-warning">
            <h3 id="identity-dialog-heading">{t('common.identityChangeTitle')}</h3>
            <p id="identity-dialog-warning">{t('common.identityChangeWarning')}</p>
            <div className="identity-actions">
                <button className="primary-button" type="button" onClick={onConfirm}
                        disabled={pending}>{t('common.identityChangeConfirm')}</button>
                <button className="text-button" type="button" onClick={onCancel}
                        disabled={pending}>{t('forms.cancel')}</button>
            </div>
        </div>
    </div>, document.body);
}

function isValidIdentity(value: string) {
    return value.length > 0 && [...value].length <= 64;
}

function displayIdentity(identity: string) {
    const characters = [...identity];
    return characters.length > 8 ? `${characters.slice(0, 8).join('')}…` : identity;
}

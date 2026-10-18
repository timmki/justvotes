import {useMutation} from '@tanstack/react-query';
import {useEffect, useId, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {apiClient} from '../api/client';
import {ApiError, type FrontendError} from '../api/errors';
import {queryClient} from '../api/queryClient';
import {queryKeys} from '../api/queryKeys';
import {useI18n} from '../i18n/I18nProvider';
import {identityActionKey} from './identityActionKey';
import {useDialogFocusTrap} from './useDialogFocusTrap';

type IdentityEditorProps = {
    identity: string | null;
    variant?: 'card' | 'compact';
    identityState?: 'ready' | 'loading' | 'error';
    startEditing?: boolean;
    onClose?: () => void;
    onSaved?: () => void;
    editorHeadingId?: string;
    confirmation?: 'dialog' | 'inline';
};

type IdentityState = 'ready' | 'loading' | 'error';

export function IdentityStatus({identity, identityState = 'ready'}: {identity: string | null; identityState?: IdentityState}) {
    const {t} = useI18n();
    if (identity) return <span aria-label={identity} title={identity}>{displayIdentity(identity)}</span>;
    if (identityState === 'ready') return <span>{t('common.identityNotSet')}</span>;
    return <span>{t('common.identityNotLoaded')}</span>;
}

export function IdentityEditor({
    identity,
    variant = 'card',
    identityState = 'ready',
    startEditing = false,
    onClose,
    onSaved,
    editorHeadingId,
    confirmation = 'dialog',
}: IdentityEditorProps) {
    const {t} = useI18n();
    const [editing, setEditing] = useState(startEditing);
    const [draft, setDraft] = useState(() => {
        if (startEditing) return identity ?? '';
        return '';
    });
    const [validationError, setValidationError] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [serverError, setServerError] = useState<FrontendError | null>(null);
    const editButtonRef = useRef<HTMLButtonElement>(null);
    const saveButtonRef = useRef<HTMLButtonElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const wasEditing = useRef(false);
    const generatedHeadingId = useId();
    const headingId = editorHeadingId ?? generatedHeadingId;
    const inputId = useId();
    const mutation = useMutation({
        mutationFn: (userID: string) => apiClient.changeIdentity({userID}),
        onSuccess: async () => {
            // Discard the old identity's projection before fetching the new cookie scope.
            await queryClient.cancelQueries({queryKey: queryKeys.identityVotes});
            await queryClient.resetQueries({queryKey: queryKeys.identityVotes});
            await Promise.all([
                queryClient.invalidateQueries({queryKey: queryKeys.identityVotes}),
                queryClient.invalidateQueries({queryKey: queryKeys.identity}),
                queryClient.invalidateQueries({queryKey: queryKeys.publicPolls}),
                queryClient.invalidateQueries({queryKey: ['poll']}),
            ]);
            setEditing(false);
            setConfirmOpen(false);
            setServerError(null);
            onSaved?.();
            onClose?.();
        },
        onError: (cause) => {
            setConfirmOpen(false);
            saveButtonRef.current?.focus();
            if (cause instanceof ApiError) setServerError(cause.frontend);
            else setServerError(null);
        },
    });

    useEffect(() => {
        if (!editing) setDraft(identity ?? '');
    }, [editing, identity]);

    useEffect(() => {
        if (!editing && wasEditing.current) editButtonRef.current?.focus();
        wasEditing.current = editing;
    }, [editing]);

    useEffect(() => {
        if (startEditing) inputRef.current?.focus();
    }, [startEditing]);

    function openEditor() {
        setDraft(identity ?? '');
        setValidationError(false);
        setServerError(null);
        setEditing(true);
    }

    function cancelEditing() {
        setEditing(false);
        setValidationError(false);
        setServerError(null);
        onClose?.();
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
    let className = 'identity-card';
    let editButtonClassName = 'text-button';
    const editLabel = t(identityActionKey(identity));
    if (compact) {
        className = 'identity-mini identity-shell-editor';
        editButtonClassName = 'identity-edit-button';
    }
    if (!identity && !compact) editButtonClassName = 'primary-button';
    if (editing) className += ' is-editing';
    return <section className={className}
                    data-identity-editor aria-labelledby={headingId}>
        <p className="eyebrow">{t('common.identity')}</p>
        {!editing && <>
            <h2 id={headingId}><IdentityStatus identity={identity} identityState={identityState}/></h2>
            {!compact && <p>{t('common.identityNote')}</p>}
            <button ref={editButtonRef} className={editButtonClassName} type="button"
                    onClick={openEditor} disabled={identityState === 'error'}>{editLabel}</button>
        </>}
        {editing && <>
            <h2 id={headingId}>{t(identityActionKey(identity))}</h2>
            {identity && <p className="confirmed-identity">{t('common.identity')}: <span title={identity}>{displayIdentity(identity)}</span></p>}
            <label htmlFor={inputId}>{t('common.identityInput')}</label>
            <input ref={inputRef} id={inputId} value={draft} onChange={(event) => {
                setDraft(event.target.value);
                setValidationError(false);
                setServerError(null);
            }} autoComplete="off"/>
            {validationError && <p className="form-error" role="alert">{t('common.identityValidation')}</p>}
            {serverError && <p className="form-error" role="alert">{t(serverError.messageKey)}</p>}
            <div className="identity-actions">
                <button ref={saveButtonRef} className="primary-button" type="button" onClick={requestSave}
                        aria-busy={mutation.isPending} disabled={mutation.isPending}>
                    {mutation.isPending && <span className="button-spinner" aria-hidden="true"/>}
                    {t('forms.submit')}
                </button>
                <button className="text-button" type="button" onClick={cancelEditing}
                        disabled={mutation.isPending}>{t('forms.cancel')}</button>
            </div>
        </>}
        {confirmOpen && confirmation === 'dialog' && <IdentityConfirmation
            identity={identity}
            onCancel={() => {
                setConfirmOpen(false);
                saveButtonRef.current?.focus();
            }}
            onConfirm={() => mutation.mutate(draft)}
            pending={mutation.isPending}/>
        }
        {confirmOpen && confirmation === 'inline' && <IdentityConfirmationContent
            identity={identity}
            onCancel={() => {
                setConfirmOpen(false);
                saveButtonRef.current?.focus();
            }}
            onConfirm={() => mutation.mutate(draft)}
            pending={mutation.isPending}/>
        }
    </section>;
}

type ConfirmationProps = {
    identity: string | null;
    onCancel: () => void;
    onConfirm: () => void;
    pending: boolean;
};

function confirmationKeys(identity: string | null) {
    if (identity) return {title: 'common.identityChangeTitle', confirm: 'common.identityChangeConfirm'} as const;
    return {title: 'common.identitySetTitle', confirm: 'common.identitySetConfirm'} as const;
}

function IdentityConfirmation({identity, onCancel, onConfirm, pending}: ConfirmationProps) {
    const {t} = useI18n();
    const dialogRef = useRef<HTMLDivElement>(null);
    const keys = confirmationKeys(identity);
    useDialogFocusTrap(dialogRef, onCancel);
    let describedBy: string | undefined;
    if (identity) describedBy = 'identity-dialog-warning';

    return createPortal(<div className="modal-backdrop">
        <div ref={dialogRef} className="identity-dialog" role="dialog" aria-modal="true" tabIndex={-1}
             aria-labelledby="identity-dialog-heading" aria-describedby={describedBy}>
            <h3 id="identity-dialog-heading">{t(keys.title)}</h3>
            {identity && <p id="identity-dialog-warning">{t('common.identityChangeWarning')}</p>}
            <div className="identity-actions">
                <button className="primary-button" type="button" onClick={onConfirm}
                        aria-busy={pending} disabled={pending}>
                    {pending && <span className="button-spinner" aria-hidden="true"/>}
                    {t(keys.confirm)}
                </button>
                <button className="text-button" type="button" onClick={onCancel}
                        disabled={pending}>{t('forms.cancel')}</button>
            </div>
        </div>
    </div>, document.body);
}

function IdentityConfirmationContent({identity, onCancel, onConfirm, pending}: ConfirmationProps) {
    const {t} = useI18n();
    const headingId = useId();
    const keys = confirmationKeys(identity);
    return <div className="identity-confirmation" role="group" aria-labelledby={headingId}>
        <h3 id={headingId}>{t(keys.title)}</h3>
        {identity && <p>{t('common.identityChangeWarning')}</p>}
        <div className="identity-actions">
            <button className="primary-button" type="button" onClick={onConfirm}
                    aria-busy={pending} disabled={pending}>
                {pending && <span className="button-spinner" aria-hidden="true"/>}
                {t(keys.confirm)}
            </button>
            <button className="text-button" type="button" onClick={onCancel}
                    disabled={pending}>{t('forms.cancel')}</button>
        </div>
    </div>;
}

function isValidIdentity(value: string) {
    return value.length > 0 && [...value].length <= 64;
}

function displayIdentity(identity: string) {
    const characters = [...identity];
    if (characters.length > 8) return `${characters.slice(0, 8).join('')}…`;
    return identity;
}

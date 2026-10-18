import {useRef} from 'react';
import {createPortal} from 'react-dom';
import {useI18n} from '../i18n/I18nProvider';
import {IdentityEditor} from './IdentityEditor';
import {useDialogFocusTrap} from './useDialogFocusTrap';

type IdentityDialogProps = {
    identity: string | null;
    identityState: 'ready' | 'loading' | 'error';
    onClose: () => void;
};

export function IdentityDialog({identity, identityState, onClose}: IdentityDialogProps) {
    const {t} = useI18n();
    const dialogRef = useRef<HTMLDivElement>(null);
    useDialogFocusTrap(dialogRef, onClose);

    return createPortal(<div className="modal-backdrop">
        <div ref={dialogRef} className="identity-dialog" role="dialog" aria-modal="true" aria-label={t('common.identityDialogTitle')} tabIndex={-1}>
            <IdentityEditor identity={identity} identityState={identityState} variant="card" startEditing confirmation="inline" onClose={onClose}/>
        </div>
    </div>, document.body);
}

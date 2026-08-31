import {createContext, type ReactNode, useContext, useState} from 'react';
import {useI18n} from '../i18n/I18nProvider';

type Toast = { id: number; message: string; tone: 'info' | 'success' | 'error' };
type ToastContextValue = {
    toasts: Toast[];
    showToast: (message: string, tone?: Toast['tone']) => void;
    dismiss: (id: number) => void
};
const ToastContext = createContext<ToastContextValue | null>(null);
let nextToastId = 1;

export function ToastProvider({children}: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const showToast = (message: string, tone: Toast['tone'] = 'info') => setToasts((current) => [...current, {
        id: nextToastId++,
        message,
        tone
    }]);
    const dismiss = (id: number) => setToasts((current) => current.filter((toast) => toast.id !== id));
    return <ToastContext value={{toasts, showToast, dismiss}}>{children}<ToastRegion/></ToastContext>;
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used inside ToastProvider');
    return context;
}

function ToastRegion() {
    const {t} = useI18n();
    const {toasts, dismiss} = useToast();
    return <div className="toast-region" aria-label={t('notifications.status')} aria-live="polite"
                aria-atomic="true">{toasts.map((toast) => <div className={`toast ${toast.tone}`} role="status"
                                                               key={toast.id}>{toast.message}
        <button type="button" aria-label={t('common.dismiss')} onClick={() => dismiss(toast.id)}>×</button>
    </div>)}</div>;
}

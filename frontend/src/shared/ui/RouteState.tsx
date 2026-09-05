import {useI18n} from '../i18n/I18nProvider';
import type {FrontendError} from '../api/errors';
import {EmptyIcon, ErrorIcon, SpinnerIcon} from './Icons';

export type StateStatus = 'loading' | 'empty' | 'error';

export function RouteState({status, onRetry = () => window.location.reload(), error, stale = false, title, text}: {
    status: StateStatus;
    onRetry?: () => void;
    error?: FrontendError;
    stale?: boolean;
    title?: string;
    text?: string
}) {
    const {t} = useI18n();
    const content = {
        loading: {title: t('common.loading'), text: t('common.loadingText'), icon: <SpinnerIcon/>},
        empty: {title: title ?? t('common.empty'), text: text ?? t('common.emptyText'), icon: <EmptyIcon/>},
        error: {
            title: error ? t(error.messageKey) : t('common.error'),
            text: error ? t(error.messageKey) : t('common.errorText'),
            icon: <ErrorIcon/>
        },
    }[status];

    return (
        <section className={`route-state ${status}`} aria-label={t('common.pageState')}>
            {status === 'loading' ?
                <div role="status">{content.icon}<span className="sr-only">{content.title}</span></div> :
                <div aria-hidden="true">{content.icon}</div>}
            <div><h3>{content.title}</h3><p>{content.text}</p>{stale &&
                <p className="stale-state" role="status">{t('common.refreshing')}</p>}{status === 'error' &&
                <button className="text-button" type="button" onClick={onRetry}>{t('common.retry')}</button>}</div>
        </section>
    );
}

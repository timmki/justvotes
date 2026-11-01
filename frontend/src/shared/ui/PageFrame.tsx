import type {ReactNode} from 'react';
import {useI18n} from '../i18n/I18nProvider';
import {useDocumentTitle} from './useDocumentTitle';

export function PageFrame({className, title, description, meta, titleHidden = false, children}: {
    className?: string;
    title: string;
    description?: string;
    meta?: ReactNode;
    titleHidden?: boolean;
    children: ReactNode
}) {
    const {t} = useI18n();
    // A page with a hidden title (the start page) is the application itself: its tab shows only the app name.
    let documentTitle = title;
    if (titleHidden) documentTitle = '';
    useDocumentTitle(documentTitle);
    let frameClassName = 'page-frame';
    if (className) frameClassName += ` ${className}`;
    let headingClassName: string | undefined;
    if (titleHidden) headingClassName = 'sr-only';
    let introClassName = 'page-intro';
    if (titleHidden) introClassName += ' sr-only';
    return (
        <div className={frameClassName}>
            <section className={introClassName} aria-labelledby="page-heading">
                <h1 id="page-heading" className={headingClassName}>{title}</h1>
                {!titleHidden && meta}
                {!titleHidden && !meta && description && <p>{description}</p>}
            </section>
            {children}
            <p className="sr-only" aria-live="polite">{t('notifications.status')}</p>
        </div>
    );
}

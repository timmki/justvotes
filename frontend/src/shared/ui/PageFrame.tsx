import type {ReactNode} from 'react';
import {useI18n} from '../i18n/I18nProvider';

export function PageFrame({className, title, description, titleHidden = false, children}: {
    className?: string;
    title: string;
    description: string;
    titleHidden?: boolean;
    children: ReactNode
}) {
    const {t} = useI18n();
    let frameClassName = 'page-frame';
    if (className) frameClassName += ` ${className}`;
    let headingClassName: string | undefined;
    if (titleHidden) headingClassName = 'sr-only';
    return (
        <div className={frameClassName}>
            <section className="page-intro" aria-labelledby="page-heading">
                <h1 id="page-heading" className={headingClassName}>{title}</h1>
                {!titleHidden && <p>{description}</p>}
            </section>
            {children}
            <p className="sr-only" aria-live="polite">{t('notifications.status')}</p>
        </div>
    );
}

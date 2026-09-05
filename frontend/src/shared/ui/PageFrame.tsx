import type {ReactNode} from 'react';
import {useI18n} from '../i18n/I18nProvider';

export function PageFrame({className, eyebrow, title, description, children}: {
    className?: string;
    eyebrow: string;
    title: string;
    description: string;
    children: ReactNode
}) {
    const {t} = useI18n();
    return (
        <div className={`page-frame${className ? ` ${className}` : ''}`}>
            <section className="page-intro" aria-labelledby="page-heading">
                <p className="eyebrow">{eyebrow}</p>
                <h1 id="page-heading">{title}</h1>
                <p>{description}</p>
            </section>
            {children}
            <p className="sr-only" aria-live="polite">{t('notifications.status')}</p>
        </div>
    );
}

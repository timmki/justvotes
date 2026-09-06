import {Link, useParams} from 'react-router-dom';
import {useI18n} from '../../shared/i18n/I18nProvider';
import {QueryState} from '../../shared/ui/QueryState';
import {RouteState} from '../../shared/ui/RouteState';
import {formatTimestamp} from './pollFormatters';
import {DataPage} from './pollPageShared';
import {projectPollDomainEvents, type PollDomainEventProjection} from './pollProjections';
import {usePollAuditQuery} from './pollQueries';

export function AuditPage() {
    const {t} = useI18n();
    const {pollId = ''} = useParams();
    const query = usePollAuditQuery(pollId);
    return <DataPage title={t('audit.title')}
                     description={t('common.auditDescription')}>
        <QueryState query={query}>{(entries) => entries.length === 0 ? <RouteState status="empty"/> :
            <AuditDetail projection={projectPollDomainEvents(entries, t)}/>}</QueryState>
        <p className="poll-detail-links"><Link to={`/poll/${encodeURIComponent(pollId)}`}>{t('common.polls')}</Link> | <Link
            to={`/poll/results/${encodeURIComponent(pollId)}`}>{t('polls.results')}</Link></p>
    </DataPage>;
}

function AuditDetail({projection}: { projection: PollDomainEventProjection }) {
    const {t, locale} = useI18n();
    return <div className="audit-layout">
        <section className="data-card audit-sheet" aria-label={t('audit.timeline')}>
            <div className="audit-sheet-heading"><div><p className="eyebrow">{t('audit.timeline')}</p><h2>{t('audit.title')}</h2></div>
                <p className="audit-count">{projection.count} {t('audit.events')}</p></div>
            <ol className="audit-timeline" aria-label={t('audit.timeline')}>{projection.entries.map(({entry, label, optionLabel, hasOption}, index) => <li className="audit-entry" key={`${entry.occurredAt}-${entry.event}-${index}`}><article>
                <div className="audit-entry-heading"><h3>{label}</h3></div><dl className="audit-entry-meta"><div><dt>{t('audit.actor')}</dt><dd>{entry.actor}</dd></div><div><dt>{t('audit.occurredAt')}</dt><dd>
                    <time dateTime={entry.occurredAt}>{formatTimestamp(entry.occurredAt, locale)}</time></dd></div></dl>
                {hasOption && <p className="audit-entry-detail"><strong>{t('audit.option')}:</strong> {optionLabel}</p>}
                {entry.userID != null && <p className="audit-entry-detail"><strong>{t('audit.identity')}:</strong> {entry.userID}</p>}
                {entry.reason != null && <p className="audit-entry-detail"><strong>{t('audit.reason')}:</strong> {entry.reason}</p>}
                {entry.votedAt != null && <p className="audit-entry-detail"><strong>{t('audit.votedAt')}:</strong> <time dateTime={entry.votedAt}>
                    {formatTimestamp(entry.votedAt, locale)}</time></p>}
            </article></li>)}</ol>
        </section>
        <aside className="audit-context-panel" aria-label={t('audit.context')}>
            <p className="eyebrow">{t('audit.context')}</p>
            <h2>{t('audit.title')}</h2>
            <p>{t('common.auditDescription')}</p>
            <dl><div><dt>{t('audit.events')}</dt><dd>{projection.count}</dd></div><div><dt>{t('audit.order')}</dt><dd>{t('audit.apiOrder')}</dd></div></dl>
        </aside>
    </div>;
}

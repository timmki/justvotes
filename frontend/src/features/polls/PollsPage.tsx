import {useI18n} from '../../shared/i18n/I18nProvider';
import {QueryState} from '../../shared/ui/QueryState';
import {RouteState} from '../../shared/ui/RouteState';
import {PublicPollCard} from './PublicPollCard';
import {DataPage} from './pollPageShared';
import {projectPollList} from './pollProjections';
import {usePollsQuery} from './pollQueries';

export function PollsPage() {
    const {t} = useI18n();
    const query = usePollsQuery();
    return <DataPage className="polls-page" eyebrow={t('common.publicArea')} title={t('polls.list')} description={t('common.publicArea')}>
        <div className="polls-content"><QueryState query={query}>{(polls) => <>
            <p className="poll-list-status" role="status" aria-live="polite">{polls.length} {t(polls.length === 1 ? 'polls.listCountSingular' : 'polls.listCount')}</p>
            {polls.length === 0 ? <RouteState status="empty"/> : <ul className="poll-list">
                {polls.map((poll) => <li key={poll.id}><PublicPollCard poll={projectPollList(poll)}/></li>)}
            </ul>}
        </>}</QueryState></div>
    </DataPage>;
}

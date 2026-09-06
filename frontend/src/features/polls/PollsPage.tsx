import {useEffect} from 'react';
import {useSearchParams} from 'react-router-dom';
import {useI18n} from '../../shared/i18n/I18nProvider';
import {QueryState} from '../../shared/ui/QueryState';
import {RouteState} from '../../shared/ui/RouteState';
import {PublicPollCard} from './PublicPollCard';
import {DataPage} from './pollPageShared';
import {hasInvalidPollDateRange, parsePollListState, projectPollListState, serializePollListState, type PollSort} from './pollListState';
import {projectPollList} from './pollProjections';
import {usePollsQuery} from './pollQueries';

export function PollsPage() {
    const {t} = useI18n();
    const query = usePollsQuery();
    const [searchParams, setSearchParams] = useSearchParams();
    const state = parsePollListState(searchParams);

    useEffect(() => {
        const canonical = serializePollListState(state).toString();
        const explicitDefaultSort = searchParams.get('sort') === 'newest';
        const canonicalSearch = explicitDefaultSort ? `sort=newest${canonical ? `&${canonical}` : ''}` : canonical;
        if (canonicalSearch !== searchParams.toString()) setSearchParams(canonicalSearch, {replace: true});
    }, [searchParams, setSearchParams, state]);

    function updateState(changes: Partial<{sort: PollSort; from: string; to: string}>) {
        const next = {...state, ...changes};
        const serialized = serializePollListState(next);
        if (changes.sort === 'newest' || (changes.sort === undefined && searchParams.get('sort') === 'newest')) {
            serialized.set('sort', 'newest');
        }
        setSearchParams(serialized);
    }

    function clearState() {
        setSearchParams({});
    }

    return <DataPage className="polls-page" eyebrow={t('common.publicArea')} title={t('polls.list')} description={t('common.publicArea')}>
        <div className="polls-content">
            <section className="poll-filters" aria-label={t('polls.filters')}>
                <div className="poll-filter-fields">
                    <label>{t('polls.sort')}<select aria-label={t('polls.sort')} value={state.sort} onChange={(event) => updateState({sort: event.target.value === 'oldest' ? 'oldest' : 'newest'})}>
                        <option value="newest">{t('polls.newest')}</option>
                        <option value="oldest">{t('polls.oldest')}</option>
                    </select></label>
                    <label>{t('polls.from')}<input aria-label={t('polls.from')} type="date" value={state.from ?? ''} onChange={(event) => updateState({from: event.target.value})}/></label>
                    <label>{t('polls.to')}<input aria-label={t('polls.to')} type="date" value={state.to ?? ''} onChange={(event) => updateState({to: event.target.value})}/></label>
                    <button className="text-button" type="button" onClick={clearState}>{t('polls.resetFilters')}</button>
                </div>
                {hasInvalidPollDateRange(state) && <p className="poll-filter-error" role="alert">{t('polls.invalidDateRange')}</p>}
            </section>
            <QueryState query={query}>{(polls) => {
                const visiblePolls = projectPollListState(polls, state);
                return <>
                    <p className="poll-list-status" role="status" aria-live="polite">{visiblePolls.length} {t(visiblePolls.length === 1 ? 'polls.listCountSingular' : 'polls.listCount')}</p>
                    {visiblePolls.length === 0 ? <RouteState status="empty"/> : <ul className="poll-list">
                        {visiblePolls.map((poll) => <li key={poll.id}><PublicPollCard poll={projectPollList(poll)}/></li>)}
                    </ul>}
                </>;
            }}</QueryState>
        </div>
    </DataPage>;
}

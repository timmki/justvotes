import {useEffect} from 'react';
import {useSearchParams} from 'react-router-dom';
import {useI18n} from '../../shared/i18n/I18nProvider';
import {QueryState} from '../../shared/ui/QueryState';
import {RouteState} from '../../shared/ui/RouteState';
import {PublicPollCard} from './PublicPollCard';
import {DataPage} from './pollPageShared';
import {hasInvalidPollDateRange, parsePollListState, projectPollListState, serializePollListState, type PollDateFilter, type PollSort} from './pollListState';
import {projectPollList} from './pollProjections';
import type {TranslationKey} from '../../shared/i18n/translations';
import {usePollsQuery} from './pollQueries';

export function PollsPage() {
    const {t} = useI18n();
    const query = usePollsQuery();
    const [searchParams, setSearchParams] = useSearchParams();
    const state = parsePollListState(searchParams);

    useEffect(() => {
        const canonical = serializePollListState(state).toString();
        const explicitDefaultSort = searchParams.get('sort') === 'newest';
        let canonicalSearch = canonical;
        if (explicitDefaultSort) {
            canonicalSearch = 'sort=newest';
            if (canonical) canonicalSearch += `&${canonical}`;
        }
        if (canonicalSearch !== searchParams.toString()) setSearchParams(canonicalSearch, {replace: true});
    }, [searchParams, setSearchParams, state]);

    function updateState(changes: Partial<{sort: PollSort; dateFilter: PollDateFilter; from: string; to: string}>) {
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

    return <DataPage className="polls-page" title={t('polls.list')} description={t('polls.listDescription')}>
        <div className="polls-content">
            <section className="poll-filters" aria-label={t('polls.filters')}>
                <div className="poll-filter-fields">
                    <label>{t('polls.sort')}<select aria-label={t('polls.sort')} value={state.sort} onChange={(event) => {
                        let sort: PollSort = 'newest';
                        if (event.target.value === 'oldest') sort = 'oldest';
                        updateState({sort});
                    }}>
                        <option value="newest">{t('polls.newest')}</option>
                        <option value="oldest">{t('polls.oldest')}</option>
                    </select></label>
                    <label>{t('polls.dateFilter')}<select aria-label={t('polls.dateFilter')} value={state.dateFilter} onChange={(event) => updateState({dateFilter: event.target.value as PollDateFilter})}>
                        <option value="all">{t('polls.allDates')}</option>
                        <option value="yesterday">{t('polls.yesterday')}</option>
                        <option value="today">{t('polls.today')}</option>
                        <option value="tomorrow">{t('polls.tomorrow')}</option>
                        <option value="date">{t('polls.date')}</option>
                    </select></label>
                    {state.dateFilter === 'date' && <>
                        <label>{t('polls.from')}<input aria-label={t('polls.from')} type="date" value={state.from ?? ''} onChange={(event) => updateState({from: event.target.value})}/></label>
                        <label>{t('polls.to')}<input aria-label={t('polls.to')} type="date" value={state.to ?? ''} onChange={(event) => updateState({to: event.target.value})}/></label>
                    </>}
                    <button className="text-button" type="button" onClick={clearState}>{t('polls.resetFilters')}</button>
                </div>
                {hasInvalidPollDateRange(state) && <p className="poll-filter-error" role="alert">{t('polls.invalidDateRange')}</p>}
            </section>
            <QueryState query={query}>{(polls) => {
                const visiblePolls = projectPollListState(polls, state);
                let countKey: 'polls.listCountSingular' | 'polls.listCount' = 'polls.listCount';
                if (visiblePolls.length === 1) countKey = 'polls.listCountSingular';
                return <>
                    <p className="poll-list-status" role="status" aria-live="polite">{visiblePolls.length} {t(countKey)}</p>
                    {visiblePolls.length === 0 && state.dateFilter === 'all' && <RouteState status="empty"/>}
                    {visiblePolls.length === 0 && state.dateFilter !== 'all' && <RouteState status="empty"
                        title={t('polls.emptyForFilter').replace('{filter}', filterLabel(state.dateFilter, t))}
                        action={<button className="text-button" type="button" onClick={clearState}>{t('polls.resetFilters')}</button>}/>}
                    {visiblePolls.length !== 0 && <ul className="poll-list">
                        {visiblePolls.map((poll) => <li key={poll.id}><PublicPollCard poll={projectPollList(poll)}/></li>)}
                    </ul>}
                </>;
            }}</QueryState>
        </div>
    </DataPage>;
}

function filterLabel(dateFilter: PollDateFilter, t: (key: TranslationKey) => string) {
    if (dateFilter === 'yesterday') return t('polls.yesterday');
    if (dateFilter === 'tomorrow') return t('polls.tomorrow');
    if (dateFilter === 'date') return t('polls.date');
    return t('polls.today');
}

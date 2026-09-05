import {Link} from 'react-router-dom';
import {apiClient} from '../../shared/api/client';
import {useApiQuery} from '../../shared/api/useApiQuery';
import {queryKeys} from '../../shared/api/queryKeys';
import {useI18n} from '../../shared/i18n/I18nProvider';
import {IdentityEditor} from '../../shared/ui/IdentityEditor';
import {PageFrame} from '../../shared/ui/PageFrame';
import {QueryState} from '../../shared/ui/QueryState';
import {RouteState} from '../../shared/ui/RouteState';
import {PublicPollCard, type PublicPoll} from '../polls/PublicPollCard';

export function HomePage() {
    const {t} = useI18n();
    const identityQuery = useApiQuery(queryKeys.identity, () => apiClient.getIdentity());
    const pollsQuery = useApiQuery(queryKeys.publicPolls, () => apiClient.getPublicPolls());
    return <PageFrame eyebrow={t('common.appName')} title={t('common.home')} description={t('common.homeDescription')}>
        <QueryState query={identityQuery}>{(identity) => <IdentityEditor identity={identity.userID}/>}</QueryState>
        <QueryState query={pollsQuery}>{(polls) => <HomeDiscovery polls={polls}/>}</QueryState>
        <footer className="home-footer"><Link className="text-link" to="/admin">{t('common.admin')}</Link></footer>
    </PageFrame>;
}

function HomeDiscovery({polls}: {polls: PublicPoll[]}) {
    const {t} = useI18n();
    const publicPolls = [...polls].filter((poll) => poll.visibility === 'public').sort(newestFirst);
    const activePolls = publicPolls.filter((poll) => poll.state === 'active');
    const featuredPoll = activePolls[0];
    const totalVotes = publicPolls.reduce((sum, poll) => sum + poll.totalVotes, 0);

    return <div className="home-discovery">
        <section className="home-featured" aria-label={t('common.featuredPoll')}>
            <div className="home-featured-heading">
                <p className="eyebrow">{t('common.featuredPoll')}</p>
                <p>{featuredPoll ? t('common.featuredPollDescription') : t('common.noActivePollText')}</p>
            </div>
            {featuredPoll ? <PublicPollCard poll={featuredPoll} featured/> : <div className="featured-fallback">
                <h2>{t('common.noActivePoll')}</h2>
                <Link className="text-link" to="/polls">{t('common.viewAllPolls')}</Link>
            </div>}
        </section>
        <dl className="discovery-stats" aria-label={t('common.discoveryMetrics')}>
            <div><dt>{t('common.activePublicPolls')}</dt><dd>{activePolls.length}</dd></div>
            <div><dt>{t('common.allPublicPolls')}</dt><dd>{publicPolls.length}</dd></div>
            <div><dt>{t('common.publicVotes')}</dt><dd>{totalVotes}</dd></div>
        </dl>
        <section className="discovery-preview" aria-labelledby="latest-polls-heading">
            <div className="section-head">
                <h2 id="latest-polls-heading">{t('common.latestPolls')}</h2>
                <Link to="/polls">{t('common.viewAllPolls')}</Link>
            </div>
            {publicPolls.length === 0 ? <RouteState status="empty"/> : <ul className="poll-list" aria-label={t('common.latestPolls')}>
                {publicPolls.slice(0, 4).map((poll) => <li key={poll.id}><PublicPollCard poll={poll}/></li>)}
            </ul>}
        </section>
    </div>;
}

function newestFirst(left: PublicPoll, right: PublicPoll) {
    const createdAt = Date.parse(right.createdAt) - Date.parse(left.createdAt);
    if (createdAt !== 0) return createdAt;
    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

export function NotFoundPage() {
    const {t} = useI18n();
    return <PageFrame eyebrow="404" title={t('errors.notFound')} description={t('errors.notFoundText')}>
        <Link className="primary-button" to="/">{t('common.home')}</Link>
    </PageFrame>;
}

import {useI18n} from '../../shared/i18n/I18nProvider';
import {PageFrame} from '../../shared/ui/PageFrame';
import {QueryState} from '../../shared/ui/QueryState';
import {RouteState} from '../../shared/ui/RouteState';
import {IdentityEditor} from '../../shared/ui/IdentityEditor';
import {useProfileQuery} from './profileQueries';
import {projectPersonalVotes} from './profileProjections';

export function ProfilePage() {
    const {t, locale} = useI18n();
    const query = useProfileQuery();
    return <PageFrame className="profile-page" title={t('profile.title')} description={t('profile.description')}>
        <QueryState query={query}>{profile => <>
            {profile.userID !== null && <p className="profile-identity">{t('common.identity')}: <strong>{profile.userID}</strong></p>}
            {profile.userID === null && <>
                <RouteState status="empty" title={t('profile.noIdentity')} text={t('profile.noIdentityText')}/>
                <IdentityEditor identity={null}/>
            </>}
            {profile.userID !== null && profile.votes.length === 0 && <RouteState status="empty" title={t('profile.noVotes')} text={t('profile.noVotesText')}/>}
            {profile.userID !== null && profile.votes.length !== 0 &&
                <ul className="profile-votes">{projectPersonalVotes(profile.votes, locale, t).map(vote => <li key={vote.pollId}>
                    <article className="profile-vote"><h2>{vote.title}</h2><dl>
                        <div><dt>{t('profile.state')}</dt><dd>{vote.state}</dd></div>
                        <div><dt>{t('profile.option')}</dt><dd>{vote.option}</dd></div>
                        <div><dt>{t('profile.votedAt')}</dt><dd><time dateTime={vote.votedAt}>{vote.timestamp}</time></dd></div>
                    </dl></article>
                </li>)}</ul>}
        </>}</QueryState>
    </PageFrame>;
}

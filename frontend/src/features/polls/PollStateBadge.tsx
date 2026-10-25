import {useI18n} from '../../shared/i18n/I18nProvider';
import {pollStateTranslationKey, type Poll} from './pollProjections';

export function PollStateBadge({state, id}: {state: Poll['state']; id?: string}) {
    const {t} = useI18n();
    return <span id={id} className={`poll-state-badge poll-state-badge--${state}`}>{t(pollStateTranslationKey(state))}</span>;
}

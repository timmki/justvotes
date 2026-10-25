import type {TranslationKey} from '../i18n/translations';

export function identityActionKey(identity: string | null): TranslationKey {
    if (identity) return 'common.identityChange';
    return 'common.identitySet';
}

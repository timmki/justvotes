import type {components} from '../../shared/api/generated/justvotes';
import {ApiError} from '../../shared/api/errors';
import type {Locale, TranslationKey} from '../../shared/i18n/translations';

export type Poll = components['schemas']['Poll'];
export type PollResults = components['schemas']['PollResults'];
export type AuditEntry = components['schemas']['AuditEntry'];
export type AuditEventType = components['schemas']['AuditEventType'];
export type Vote = components['schemas']['Vote'];

export type PollListProjection = Poll;

// Projections keep generated API data separate from route-specific derived behavior.
export function projectPollList(poll: Poll): PollListProjection {
    return poll;
}

export type PollResultsProjection = {
    results: PollResults;
    currentOptionNumber: number | null;
    orderedOptions: PollResults['options'];
    winnerOptions: PollResults['options'];
    highestPercentage: number;
};

export function projectPollResults(results: PollResults, identity: string | null, locale: Locale): PollResultsProjection {
    const orderedOptions = orderResultOptions(results.options, locale, results.totalVotes);
    return {
        results,
        currentOptionNumber: currentOptionNumberFromResults(results, identity),
        orderedOptions,
        winnerOptions: orderedOptions.filter((option) => isWinner(option, results.options, results.totalVotes)),
        highestPercentage: percentage(highestVoteCount(results.options), results.totalVotes),
    };
}

export function currentOptionNumberFromResults(results: PollResults | undefined, identity: string | null) {
    if (!results || !identity) return null;
    return results.options.find((option) => option.votes.some((vote) => vote.userID === identity))?.number ?? null;
}

export function percentage(voteCount: number, totalVotes: number) {
    return totalVotes === 0 ? 0 : Math.round(voteCount / totalVotes * 100);
}

export function isWinner(option: PollResults['options'][number], options: PollResults['options'], totalVotes: number) {
    const maximum = Math.max(0, ...options.map((candidate) => candidate.voteCount));
    return totalVotes > 0 && maximum > 0 && option.voteCount === maximum;
}

function highestVoteCount(options: PollResults['options']) {
    return Math.max(0, ...options.map((option) => option.voteCount));
}

function orderResultOptions(options: PollResults['options'], locale: Locale, totalVotes: number) {
    return [...options].sort((left, right) => {
        const leftWinner = isWinner(left, options, totalVotes);
        const rightWinner = isWinner(right, options, totalVotes);
        if (leftWinner !== rightWinner) return leftWinner ? -1 : 1;
        return left.text.localeCompare(right.text, locale);
    });
}

export type PollDomainEventProjectionEntry = {
    entry: AuditEntry;
    label: string;
    optionLabel: string | null;
    hasOption: boolean;
};

export type PollDomainEventProjection = {
    entries: PollDomainEventProjectionEntry[];
    count: number;
};

export function projectPollDomainEvents(entries: AuditEntry[], t: (key: TranslationKey) => string): PollDomainEventProjection {
    return {
        count: entries.length,
        entries: [...entries].reverse().map((entry) => {
            const optionLabel = auditOptionLabel(entry, t);
            return {
                entry,
                label: auditEventLabel(entry.event, t),
                optionLabel,
                hasOption: entry.selection != null || entry.optionNumber != null,
            };
        }),
    };
}

const auditEventTranslationKeys: Record<AuditEventType, TranslationKey> = {
    PollPublished: 'audit.pollPublished',
    PollExpired: 'audit.pollExpired',
    PollArchived: 'audit.pollArchived',
    PollRestoredFromArchive: 'audit.pollRestoredFromArchive',
    PollExpiryChanged: 'audit.pollExpiryChanged',
    PollReopened: 'audit.pollReopened',
    PollSoftDeleted: 'audit.pollSoftDeleted',
    PollRestored: 'audit.pollRestored',
    VoteCast: 'audit.voteCast',
    VoteReplaced: 'audit.voteReplaced',
    VoteWithdrawn: 'audit.voteWithdrawn',
    VoteRemovedForIdentityChange: 'audit.voteRemovedForIdentityChange',
    VoteRemovedByAdmin: 'audit.voteRemovedByAdmin',
};

function auditEventLabel(event: AuditEntry['event'], t: (key: TranslationKey) => string) {
    if (!Object.prototype.hasOwnProperty.call(auditEventTranslationKeys, event)) return t('audit.unknownEvent');
    return t(auditEventTranslationKeys[event as AuditEventType]);
}

function auditOptionLabel(entry: AuditEntry, t: (key: TranslationKey) => string) {
    if (entry.selection != null) return entry.selection;
    return entry.optionNumber == null ? null : `${t('audit.optionNumber')} ${entry.optionNumber}`;
}

export type ResultsReleaseState = 'available' | 'requiresVote' | 'unavailable' | 'checking';

export function classifyResultsRelease({isPending, isError, forbiddenBeforeVote}: {
    isPending: boolean;
    isError: boolean;
    forbiddenBeforeVote: boolean;
}): ResultsReleaseState {
    if (isPending) return 'checking';
    if (forbiddenBeforeVote) return 'requiresVote';
    if (isError) return 'unavailable';
    return 'available';
}

export function isResultsUnavailable(error: unknown) {
    return error instanceof ApiError && error.frontend.status === 403 && error.frontend.code === 'results-not-available';
}

export function pollStateTranslationKey(state: Poll['state']): TranslationKey {
    const keys: Record<Poll['state'], TranslationKey> = {
        draft: 'admin.stateDraft',
        active: 'admin.stateActive',
        expired: 'admin.stateExpired',
        archived: 'admin.stateArchived',
        deleted: 'admin.stateDeleted',
    };
    return keys[state];
}

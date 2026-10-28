export const queryKeys = {
    session: ['session'] as const,
    identityVotes: ['identityVotes'] as const,
    publicPolls: ['polls', 'public'] as const,
    poll: (pollId: string) => ['poll', pollId] as const,
    pollResults: (pollId: string) => ['poll', pollId, 'results'] as const,
    pollAudit: (pollId: string) => ['poll', pollId, 'audit'] as const,
    adminVotesRoot: ['admin', 'votes'] as const,
    adminVotes: (page: number, size: number) => ['admin', 'votes', {page, size}] as const,
    adminPolls: ['admin', 'polls'] as const,
    templates: ['admin', 'templates'] as const,
    groups: ['admin', 'groups'] as const,
    groupTemplates: (groupId: string) => ['admin', 'groups', groupId, 'templates'] as const,
    accounts: ['admin', 'accounts'] as const,
    invitations: ['admin', 'invitations'] as const,
};

/**
 * Everything that belongs to a signed-in account; removed when the session ends.
 */
export const protectedQueryPrefixes = [
    ['admin'],
    queryKeys.identityVotes,
    ['polls'],
    ['poll'],
] as const;

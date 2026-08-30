export const queryKeys = {
  identity: ['identity'] as const,
  publicPolls: ['polls', 'public'] as const,
  poll: (pollId: string) => ['poll', pollId] as const,
  pollResults: (pollId: string) => ['poll', pollId, 'results'] as const,
  pollAudit: (pollId: string) => ['poll', pollId, 'audit'] as const,
  adminSession: ['admin', 'session'] as const,
  adminVotes: (page: number, size: number) => ['admin', 'votes', { page, size }] as const,
  adminPolls: ['admin', 'polls'] as const,
  templates: ['admin', 'templates'] as const,
  groups: ['admin', 'groups'] as const,
};

export const protectedQueryPrefixes = [
  queryKeys.adminSession,
  ['admin', 'votes'] as const,
  queryKeys.adminPolls,
  queryKeys.templates,
  queryKeys.groups,
] as const;

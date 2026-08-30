import {
  AuditEntry,
  AuditEventType,
  PollState,
  PollVisibility,
  VoteStatus,
} from "../../target/generated-sources/typescript/src/models";

function assertNever(value: never): never {
  throw new Error(`Unhandled contract value: ${String(value)}`);
}

export function describeVisibility(value: PollVisibility): string {
  switch (value) {
    case PollVisibility.private:
      return "private";
    case PollVisibility.public:
      return "public";
    default:
      return assertNever(value);
  }
}

export function describePollState(value: PollState): string {
  switch (value) {
    case PollState.draft:
      return "draft";
    case PollState.active:
      return "active";
    case PollState.expired:
      return "expired";
    case PollState.archived:
      return "archived";
    case PollState.deleted:
      return "deleted";
    default:
      return assertNever(value);
  }
}

export function describeVoteStatus(value: VoteStatus): string {
  switch (value) {
    case VoteStatus.created:
      return "created";
    case VoteStatus.replaced:
      return "replaced";
    case VoteStatus.unchanged:
      return "unchanged";
    default:
      return assertNever(value);
  }
}

export function describeAuditEvent(value: AuditEventType): string {
  switch (value) {
    case AuditEventType.PollPublished:
    case AuditEventType.PollExpired:
    case AuditEventType.PollArchived:
    case AuditEventType.PollRestoredFromArchive:
    case AuditEventType.PollExpiryChanged:
    case AuditEventType.PollReopened:
    case AuditEventType.PollSoftDeleted:
    case AuditEventType.PollRestored:
    case AuditEventType.VoteCast:
    case AuditEventType.VoteReplaced:
    case AuditEventType.VoteWithdrawn:
    case AuditEventType.VoteRemovedForIdentityChange:
    case AuditEventType.VoteRemovedByAdmin:
      return value;
    default:
      return assertNever(value);
  }
}

export function describeAuditEntry(value: AuditEntry): string {
  switch (value.event) {
    case AuditEventType.PollPublished:
    case AuditEventType.PollExpired:
    case AuditEventType.PollArchived:
    case AuditEventType.PollRestoredFromArchive:
    case AuditEventType.PollExpiryChanged:
    case AuditEventType.PollReopened:
    case AuditEventType.PollSoftDeleted:
    case AuditEventType.PollRestored:
    case AuditEventType.VoteCast:
    case AuditEventType.VoteReplaced:
    case AuditEventType.VoteWithdrawn:
    case AuditEventType.VoteRemovedForIdentityChange:
    case AuditEventType.VoteRemovedByAdmin:
      return describeAuditEvent(value.event);
    default:
      return assertNever(value);
  }
}

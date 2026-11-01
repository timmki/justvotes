package de.justvotes.adapters.membership;

import de.justvotes.accountmanagement.core.ports.out.MemberJoinedListener;
import de.justvotes.pollmanagement.core.ports.in.ExtendMemberPolls;
import de.justvotes.templatecatalog.core.ports.in.SyncMemberTemplates;

/**
 * Hands a new member to the template catalog and to the polls following the members group, in the caller's transaction.
 */
public final class MemberJoinedFanOut implements MemberJoinedListener {
    private final SyncMemberTemplates catalog;
    private final ExtendMemberPolls polls;

    public MemberJoinedFanOut(SyncMemberTemplates catalog, ExtendMemberPolls polls) {
        this.catalog = catalog;
        this.polls = polls;
    }

    @Override
    public void memberJoined(String identity) {
        catalog.memberJoined(identity);
        polls.memberJoined(identity);
    }
}

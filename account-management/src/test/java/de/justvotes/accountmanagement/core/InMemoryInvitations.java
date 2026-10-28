package de.justvotes.accountmanagement.core;

import de.justvotes.accountmanagement.core.model.Invitation;
import de.justvotes.accountmanagement.core.model.InvitationId;
import de.justvotes.accountmanagement.core.model.InvitationStatus;
import de.justvotes.accountmanagement.core.model.InvitationTokenHash;
import de.justvotes.accountmanagement.core.ports.out.InvitationRepository;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

final class InMemoryInvitations implements InvitationRepository {
    private final Map<Long, Invitation> invitations = new LinkedHashMap<>();
    private long nextId = 1;

    @Override
    public Optional<Invitation> findById(InvitationId id) {
        return Optional.ofNullable(invitations.get(id.value()));
    }

    @Override
    public Optional<Invitation> findByTokenHash(InvitationTokenHash tokenHash) {
        return invitations.values().stream().filter(invitation -> invitation.tokenHash().equals(tokenHash)).findFirst();
    }

    @Override
    public boolean existsOpenByEmailKey(String normalizedEmail) {
        return invitations.values().stream().anyMatch(invitation -> invitation.status() == InvitationStatus.OPEN
                && invitation.email().normalized().equals(normalizedEmail));
    }

    @Override
    public List<Invitation> findAll() {
        return new ArrayList<>(invitations.values());
    }

    @Override
    public Invitation save(Invitation invitation) {
        if (invitation.id().isPresent()) {
            invitations.put(invitation.id().get().value(), invitation);
            return invitation;
        }
        long id = nextId++;
        Invitation stored = Invitation.restore(InvitationId.of(id), invitation.email(), invitation.tokenHash(),
                invitation.status(), invitation.deliveryFailed(), invitation.issuedAt(), invitation.expiresAt(),
                invitation.acceptedAt().orElse(null), invitation.acceptedAccountId().orElse(null));
        invitations.put(id, stored);
        return stored;
    }
}

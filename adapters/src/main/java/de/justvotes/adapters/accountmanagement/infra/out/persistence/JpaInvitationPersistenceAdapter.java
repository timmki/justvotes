package de.justvotes.adapters.accountmanagement.infra.out.persistence;

import de.justvotes.accountmanagement.core.model.Invitation;
import de.justvotes.accountmanagement.core.model.InvitationId;
import de.justvotes.accountmanagement.core.model.InvitationStatus;
import de.justvotes.accountmanagement.core.model.InvitationTokenHash;
import de.justvotes.accountmanagement.core.ports.out.InvitationRepository;

import java.util.List;
import java.util.Optional;

public final class JpaInvitationPersistenceAdapter implements InvitationRepository {
    private final SpringDataInvitationRepository invitations;

    public JpaInvitationPersistenceAdapter(SpringDataInvitationRepository invitations) {
        this.invitations = invitations;
    }

    @Override
    public Optional<Invitation> findById(InvitationId id) {
        return invitations.findById(Math.toIntExact(id.value())).map(InvitationEntity::toDomain);
    }

    @Override
    public Optional<Invitation> findByTokenHash(InvitationTokenHash tokenHash) {
        return invitations.findByTokenHash(tokenHash.value()).map(InvitationEntity::toDomain);
    }

    @Override
    public boolean existsOpenByEmailKey(String normalizedEmail) {
        return invitations.existsByEmailKeyAndStatus(normalizedEmail, InvitationStatus.OPEN.name());
    }

    @Override
    public List<Invitation> findAll() {
        return invitations.findAll().stream().map(InvitationEntity::toDomain).toList();
    }

    @Override
    public Invitation save(Invitation invitation) {
        if (invitation.id().isEmpty()) {
            return invitations.save(InvitationEntity.from(invitation)).toDomain();
        }
        InvitationEntity entity = invitations.findById(Math.toIntExact(invitation.id().get().value()))
                .orElseThrow(() -> new IllegalStateException("The invitation no longer exists."));
        entity.apply(invitation);
        return invitations.save(entity).toDomain();
    }
}

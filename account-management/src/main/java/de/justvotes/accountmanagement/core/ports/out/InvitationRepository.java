package de.justvotes.accountmanagement.core.ports.out;

import de.justvotes.accountmanagement.core.model.Invitation;
import de.justvotes.accountmanagement.core.model.InvitationId;
import de.justvotes.accountmanagement.core.model.InvitationTokenHash;

import java.util.List;
import java.util.Optional;

public interface InvitationRepository {
    Optional<Invitation> findById(InvitationId id);

    Optional<Invitation> findByTokenHash(InvitationTokenHash tokenHash);

    boolean existsOpenByEmailKey(String normalizedEmail);

    List<Invitation> findAll();

    Invitation save(Invitation invitation);
}

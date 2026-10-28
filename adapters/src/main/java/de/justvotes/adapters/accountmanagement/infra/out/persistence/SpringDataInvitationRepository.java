package de.justvotes.adapters.accountmanagement.infra.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SpringDataInvitationRepository extends JpaRepository<InvitationEntity, Integer> {
    Optional<InvitationEntity> findByTokenHash(String tokenHash);

    boolean existsByEmailKeyAndStatus(String emailKey, String status);
}

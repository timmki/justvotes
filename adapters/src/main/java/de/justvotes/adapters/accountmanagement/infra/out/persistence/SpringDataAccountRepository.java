package de.justvotes.adapters.accountmanagement.infra.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SpringDataAccountRepository extends JpaRepository<AccountEntity, Integer> {
    Optional<AccountEntity> findByNameKey(String nameKey);

    Optional<AccountEntity> findFirstByRole(String role);

    boolean existsByNameKey(String nameKey);

    boolean existsByIdentityKey(String identityKey);

    boolean existsByEmailKey(String emailKey);
}

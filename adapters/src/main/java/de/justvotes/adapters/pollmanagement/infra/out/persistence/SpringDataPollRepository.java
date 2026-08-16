package de.justvotes.adapters.pollmanagement.infra.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SpringDataPollRepository extends JpaRepository<PollEntity, String> {
    List<PollEntity> findAllByCreatedBy(String createdBy);

    List<PollEntity> findAllByVisibility(String visibility);
}

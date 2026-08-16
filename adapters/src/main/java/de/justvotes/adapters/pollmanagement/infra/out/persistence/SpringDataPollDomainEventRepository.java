package de.justvotes.adapters.pollmanagement.infra.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SpringDataPollDomainEventRepository extends JpaRepository<PollDomainEventEntity, Integer> {
    java.util.List<PollDomainEventEntity> findAllByPollIdOrderByCreatedAtAscIdAsc(String pollId);

    void deleteAllByPollId(String pollId);
}

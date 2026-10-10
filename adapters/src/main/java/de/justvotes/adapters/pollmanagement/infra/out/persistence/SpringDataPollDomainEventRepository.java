package de.justvotes.adapters.pollmanagement.infra.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SpringDataPollDomainEventRepository extends JpaRepository<PollDomainEventEntity, Integer> {
    List<PollDomainEventEntity> findAllByPollIdOrderByCreatedAtAscIdAsc(String pollId);

    void deleteAllByPollId(String pollId);
}

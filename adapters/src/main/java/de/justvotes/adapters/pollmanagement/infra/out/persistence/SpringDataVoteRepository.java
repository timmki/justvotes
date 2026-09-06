package de.justvotes.adapters.pollmanagement.infra.out.persistence;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface SpringDataVoteRepository extends JpaRepository<VoteEntity, Integer> {
    void deleteAllByPoll_Id(String pollId);

    @Query(value = """
            select v.id as voteId,
                   v.userId as userId,
                   v.votedAt as votedAt,
                   p.id as pollId,
                   p.title as pollTitle,
                   o.number as optionNumber,
                   o.text as optionText
            from VoteEntity v
            join v.poll p
            join v.option o
            order by p.title asc, p.id asc, o.number asc, v.userId asc, v.id asc
            """,
            countQuery = "select count(v) from VoteEntity v")
    Page<AdminVoteProjection> findAllForAdministration(Pageable pageable);
}

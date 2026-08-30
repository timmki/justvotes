package de.justvotes.adapters.pollmanagement.infra.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface SpringDataPollRepository extends JpaRepository<PollEntity, String> {
    List<PollEntity> findAllByCreatedByOrderByCreatedAtAsc(String createdBy);

    List<PollEntity> findAllByVisibility(String visibility);

    @Query("""
            select p.id as id,
                   p.title as title,
                   p.visibility as visibility,
                   p.state as state,
                   p.createdAt as createdAt,
                   p.endsAt as endsAt,
                   p.templateGroupId as templateGroupId,
                   p.templateGroupName as templateGroupName,
                   p.templateGroupDescription as templateGroupDescription,
                   option.number as optionNumber,
                   option.text as optionText,
                   snapshot.number as templateSnapshotOptionNumber,
                   snapshot.text as templateSnapshotOptionText,
                   count(distinct vote.id) as totalVotes
            from PollEntity p
            left join p.options option
            left join p.templateSnapshotOptions snapshot
            left join p.votes vote
            where p.visibility = 'public'
              and p.state in ('active', 'expired')
            group by p.id, p.title, p.visibility, p.state, p.createdAt, p.endsAt,
                     p.templateGroupId, p.templateGroupName, p.templateGroupDescription,
                     option.number, option.text, snapshot.number, snapshot.text
            order by p.createdAt asc, p.id asc, option.number asc, snapshot.number asc
            """)
    List<PollSummaryProjection> findAllPublicSummaries();

    List<PollEntity> findAllByVisibilityAndState(String visibility, String state);

    List<PollEntity> findAllByState(String state);
}

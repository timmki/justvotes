package de.justvotes.adapters.pollmanagement.infra.out.persistence;

import de.justvotes.pollmanagement.core.event.PollDomainEvent;
import de.justvotes.pollmanagement.core.model.Vote;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "PollDomainEvent")
public class PollDomainEventEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    @Column(name = "pollId")
    private String pollId;
    @Column(name = "eventType")
    private String eventType;
    @Column(name = "actorId")
    private String actorId;
    private String metadata;
    @Column(name = "createdAt")
    private String createdAt;
    @Column(name = "voteId")
    private Integer voteId;
    private String reason;
    @Column(name = "voteUserID")
    private String voteUserId;
    @Column(name = "voteOptionNumber")
    private Integer voteOptionNumber;
    @Column(name = "voteVotedAt")
    private String voteVotedAt;

    protected PollDomainEventEntity() {
    }

    PollDomainEventEntity(String pollId, String eventType, String actorId, String metadata) {
        this(pollId, eventType, actorId, metadata, Instant.now());
    }

    PollDomainEventEntity(String pollId, String eventType, String actorId, String metadata, Instant createdAt) {
        this.pollId = pollId;
        this.eventType = eventType;
        this.actorId = actorId;
        this.metadata = metadata;
        this.createdAt = createdAt.toString();
    }

    PollDomainEventEntity(PollDomainEvent event) {
        this(event.pollId().value(), event.eventType(), event.actorId(), event.selection(), event.occurredAt());
        this.reason = event.reason();
        Vote vote = event.affectedVote();
        if (vote != null) {
            this.voteId = Math.toIntExact(vote.id());
            this.voteUserId = vote.identity().value();
            this.voteOptionNumber = vote.optionNumber();
            this.voteVotedAt = vote.votedAt().toString();
        }
    }

    String actorId() {
        return actorId;
    }

    String eventType() {
        return eventType;
    }

    String metadata() {
        return metadata;
    }

    Instant createdAt() {
        return Instant.parse(createdAt.replace(' ', 'T') + (createdAt.endsWith("Z") ? "" : "Z"));
    }

    Integer voteId() {
        return voteId;
    }

    String reason() {
        return reason;
    }

    String voteUserId() {
        return voteUserId;
    }

    Integer voteOptionNumber() {
        return voteOptionNumber;
    }

    Instant voteVotedAt() {
        return voteVotedAt == null ? null : Instant.parse(voteVotedAt.replace(' ', 'T') + (voteVotedAt.endsWith("Z") ? "" : "Z"));
    }
}

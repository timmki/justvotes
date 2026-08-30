package de.justvotes.adapters.pollmanagement.infra.out.persistence;

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
}

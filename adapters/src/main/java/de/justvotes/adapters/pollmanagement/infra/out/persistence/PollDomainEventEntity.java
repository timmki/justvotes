package de.justvotes.adapters.pollmanagement.infra.out.persistence;

import jakarta.persistence.*;

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
        this.pollId = pollId;
        this.eventType = eventType;
        this.actorId = actorId;
        this.metadata = metadata;
        this.createdAt = java.time.Instant.now().toString();
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

    java.time.Instant createdAt() {
        return java.time.Instant.parse(createdAt.replace(' ', 'T') + (createdAt.endsWith("Z") ? "" : "Z"));
    }
}

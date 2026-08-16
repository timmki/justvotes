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

    protected PollDomainEventEntity() {
    }

    PollDomainEventEntity(String pollId, String eventType, String actorId) {
        this.pollId = pollId;
        this.eventType = eventType;
        this.actorId = actorId;
    }
}

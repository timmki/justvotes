package de.justvotes.adapters.pollmanagement.infra.out.persistence;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "Vote")
public class VoteEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    @ManyToOne
    @JoinColumn(name = "optionID")
    private PollOptionEntity option;
    @ManyToOne
    @JoinColumn(name = "pollID")
    private PollEntity poll;
    @Column(name = "userID")
    private String userId;
    @Column(name = "votedAt")
    private String votedAt;

    protected VoteEntity() {
    }

    VoteEntity(PollEntity poll, PollOptionEntity option, String userId, Instant votedAt) {
        this.poll = poll;
        this.option = option;
        this.userId = userId;
        this.votedAt = votedAt.toString();
    }

    PollOptionEntity option() {
        return option;
    }

    String userId() {
        return userId;
    }

    Instant votedAt() {
        return Instant.parse(votedAt.replace(' ', 'T') + (votedAt.endsWith("Z") ? "" : "Z"));
    }

    void replaceOption(PollOptionEntity option, Instant votedAt) {
        this.option = option;
        this.votedAt = votedAt.toString();
    }
}

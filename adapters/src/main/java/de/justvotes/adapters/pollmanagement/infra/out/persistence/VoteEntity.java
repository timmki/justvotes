package de.justvotes.adapters.pollmanagement.infra.out.persistence;

import jakarta.persistence.*;

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

    protected VoteEntity() {
    }

    VoteEntity(PollEntity poll, PollOptionEntity option, String userId) {
        this.poll = poll;
        this.option = option;
        this.userId = userId;
    }

    PollOptionEntity option() {
        return option;
    }

    String userId() {
        return userId;
    }

    void replaceOption(PollOptionEntity option) {
        this.option = option;
    }
}

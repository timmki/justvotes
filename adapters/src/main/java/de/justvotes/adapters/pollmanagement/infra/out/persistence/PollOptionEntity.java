package de.justvotes.adapters.pollmanagement.infra.out.persistence;

import jakarta.persistence.*;

@Entity
@Table(name = "Option")
public class PollOptionEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    @ManyToOne
    @JoinColumn(name = "pollID")
    private PollEntity poll;
    private int number;
    private String text;

    protected PollOptionEntity() {
    }

    PollOptionEntity(PollEntity poll, int number, String text) {
        this.poll = poll;
        this.number = number;
        this.text = text;
    }

    int number() {
        return number;
    }

    String text() {
        return text;
    }
}

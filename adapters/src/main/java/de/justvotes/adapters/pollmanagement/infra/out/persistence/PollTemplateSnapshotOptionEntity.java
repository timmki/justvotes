package de.justvotes.adapters.pollmanagement.infra.out.persistence;

import jakarta.persistence.*;

@Entity
@Table(name = "PollTemplateSnapshotOption")
public class PollTemplateSnapshotOptionEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    @ManyToOne
    @JoinColumn(name = "pollID")
    private PollEntity poll;
    private int number;
    private String text;

    protected PollTemplateSnapshotOptionEntity() {
    }

    PollTemplateSnapshotOptionEntity(PollEntity poll, int number, String text) {
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

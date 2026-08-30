package de.justvotes.adapters.pollmanagement.infra.out.persistence;

import de.justvotes.pollmanagement.core.model.Vote;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.*;

@Entity
@Table(name = "Poll")
public class PollEntity {
    @Id
    private String id;
    private String title;
    private String visibility;
    private String state;
    @Column(name = "endsAt")
    private String endsAt;
    @Column(name = "createdBy")
    private String createdBy;
    @Column(name = "createdAt", updatable = false)
    private String createdAt;
    @Column(name = "templateGroupID")
    private int templateGroupId;
    @Column(name = "templateGroupName")
    private String templateGroupName;
    @Column(name = "templateGroupDescription")
    private String templateGroupDescription;
    @OneToMany(mappedBy = "poll", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PollOptionEntity> options = new ArrayList<>();
    @OneToMany(mappedBy = "poll", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PollTemplateSnapshotOptionEntity> templateSnapshotOptions = new ArrayList<>();
    @OneToMany(mappedBy = "poll", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<VoteEntity> votes = new ArrayList<>();

    protected PollEntity() {
    }

    PollEntity(String id, String title, String createdBy, String visibility, String state, String createdAt, String endsAt, long templateGroupId, String templateGroupName, String templateGroupDescription) {
        this.id = id;
        this.title = title;
        this.createdBy = createdBy;
        this.visibility = visibility;
        this.state = state;
        this.createdAt = createdAt;
        this.endsAt = endsAt;
        this.templateGroupId = Math.toIntExact(templateGroupId);
        this.templateGroupName = templateGroupName;
        this.templateGroupDescription = templateGroupDescription;
    }

    String id() {
        return id;
    }

    String title() {
        return title;
    }

    String createdBy() {
        return createdBy;
    }

    Instant createdAt() {
        return parseInstant(createdAt);
    }

    String visibility() {
        return visibility;
    }

    String state() {
        return state;
    }

    Instant endsAt() {
        return endsAt == null ? null : parseInstant(endsAt);
    }

    static Instant parseInstant(String value) {
        return Instant.parse(value.replace(' ', 'T') + (value.endsWith("Z") ? "" : "Z"));
    }

    long templateGroupId() {
        return templateGroupId;
    }

    String templateGroupName() {
        return templateGroupName;
    }

    String templateGroupDescription() {
        return templateGroupDescription;
    }

    List<PollOptionEntity> options() {
        return options;
    }

    List<PollTemplateSnapshotOptionEntity> templateSnapshotOptions() {
        return templateSnapshotOptions;
    }

    List<VoteEntity> votes() {
        return votes;
    }

    void clearOptions() {
        options.clear();
    }

    void updateLifecycle(String visibility, String state, Instant endsAt) {
        this.visibility = visibility;
        this.state = state;
        this.endsAt = endsAt == null ? null : endsAt.toString();
    }

    void addOptions(List<String> texts) {
        for (int index = 0; index < texts.size(); index++)
            options.add(new PollOptionEntity(this, index + 1, texts.get(index)));
    }

    void addTemplateSnapshotOptions(List<String> texts) {
        for (int index = 0; index < texts.size(); index++)
            templateSnapshotOptions.add(new PollTemplateSnapshotOptionEntity(this, index + 1, texts.get(index)));
    }

    void synchronizeVotes(List<Vote> desiredVotes) {
        Map<String, VoteEntity> existingVotes = new HashMap<>();
        for (var vote : votes) {
            existingVotes.put(vote.userId(), vote);
        }

        Set<String> desiredIdentities = new HashSet<>();
        for (var desiredVote : desiredVotes) {
            String identity = desiredVote.identity().value();
            desiredIdentities.add(identity);
            PollOptionEntity option = option(desiredVote.optionNumber());
            VoteEntity existingVote = existingVotes.get(identity);
            if (existingVote == null) {
                votes.add(new VoteEntity(this, option, identity, desiredVote.votedAt()));
            } else {
                existingVote.replaceOption(option, desiredVote.votedAt());
            }
        }

        votes.removeIf(vote -> !desiredIdentities.contains(vote.userId()));
    }

    private PollOptionEntity option(int number) {
        return options.stream()
                .filter(option -> option.number() == number)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Poll option is missing"));
    }
}

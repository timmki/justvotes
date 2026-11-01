package de.justvotes.adapters.pollmanagement.infra.out.persistence;

import de.justvotes.pollmanagement.core.model.Poll.Option;
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
    @Column(name = "followsMembers", updatable = false)
    private int followsMembers;
    @OneToMany(mappedBy = "poll", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PollOptionEntity> options = new ArrayList<>();
    @OneToMany(mappedBy = "poll", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PollTemplateSnapshotOptionEntity> templateSnapshotOptions = new ArrayList<>();
    @OneToMany(mappedBy = "poll", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<VoteEntity> votes = new ArrayList<>();

    protected PollEntity() {
    }

    PollEntity(String id, String title, String createdBy, String visibility, String state, String createdAt, String endsAt, long templateGroupId, String templateGroupName, String templateGroupDescription, boolean followsMembers) {
        if (followsMembers) {
            this.followsMembers = 1;
        }
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

    static Instant parseInstant(String value) {
        String timestamp = value.replace(' ', 'T');
        if (!value.endsWith("Z")) {
            timestamp += "Z";
        }
        return Instant.parse(timestamp);
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
        if (endsAt == null) {
            return null;
        }
        return parseInstant(endsAt);
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

    boolean followsMembers() {
        return followsMembers == 1;
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
        if (endsAt == null) {
            this.endsAt = null;
        } else {
            this.endsAt = endsAt.toString();
        }
    }

    /**
     * Updates option rows by number so votes keep their option row; rows only disappear when a draft lost options.
     */
    void synchronizeOptions(List<Option> desired) {
        Map<Integer, String> texts = new HashMap<>();
        desired.forEach(option -> texts.put(option.number(), option.text()));
        options.removeIf(option -> !texts.containsKey(option.number()));
        options.forEach(option -> option.changeText(texts.get(option.number())));
        Set<Integer> existing = new HashSet<>();
        options.forEach(option -> existing.add(option.number()));
        desired.stream().filter(option -> !existing.contains(option.number()))
                .forEach(option -> options.add(new PollOptionEntity(this, option.number(), option.text())));
    }

    void addMissingTemplateSnapshotOptions(List<Option> desired) {
        Set<Integer> existing = new HashSet<>();
        templateSnapshotOptions.forEach(option -> existing.add(option.number()));
        desired.stream().filter(option -> !existing.contains(option.number()))
                .forEach(option -> templateSnapshotOptions.add(new PollTemplateSnapshotOptionEntity(this, option.number(), option.text())));
    }

    void synchronizeVotes(List<Vote> desiredVotes) {
        Map<String, VoteEntity> existingVotes = new HashMap<>();
        for (VoteEntity vote : votes) {
            existingVotes.put(vote.userId(), vote);
        }

        Set<String> desiredIdentities = new HashSet<>();
        for (Vote desiredVote : desiredVotes) {
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

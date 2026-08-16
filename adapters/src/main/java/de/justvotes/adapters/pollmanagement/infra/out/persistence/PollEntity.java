package de.justvotes.adapters.pollmanagement.infra.out.persistence;

import jakarta.persistence.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Entity
@Table(name = "Poll")
public class PollEntity {
    @Id
    private String id;
    private String title;
    private String visibility;
    private String state;
    @Column(name = "createdBy")
    private String createdBy;
    @Column(name = "templateGroupID")
    private int templateGroupId;
    @Column(name = "templateGroupName")
    private String templateGroupName;
    @OneToMany(mappedBy = "poll", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PollOptionEntity> options = new ArrayList<>();
    @OneToMany(mappedBy = "poll", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PollTemplateSnapshotOptionEntity> templateSnapshotOptions = new ArrayList<>();
    @OneToMany(mappedBy = "poll", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<VoteEntity> votes = new ArrayList<>();

    protected PollEntity() {
    }

    PollEntity(String id, String title, String createdBy, String visibility, String state, long templateGroupId, String templateGroupName) {
        this.id = id;
        this.title = title;
        this.createdBy = createdBy;
        this.visibility = visibility;
        this.state = state;
        this.templateGroupId = Math.toIntExact(templateGroupId);
        this.templateGroupName = templateGroupName;
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

    String visibility() {
        return visibility;
    }

    String state() {
        return state;
    }

    long templateGroupId() {
        return templateGroupId;
    }

    String templateGroupName() {
        return templateGroupName;
    }

    List<PollOptionEntity> options() {
        return options;
    }

    List<PollTemplateSnapshotOptionEntity> templateSnapshotOptions() {
        return templateSnapshotOptions;
    }
    List<VoteEntity> votes() { return votes; }

    void clearOptions() {
        options.clear();
    }
    void updateVisibilityAndState(String visibility, String state) {
        this.visibility = visibility;
        this.state = state;
    }

    void addOptions(List<String> texts) {
        for (int index = 0; index < texts.size(); index++)
            options.add(new PollOptionEntity(this, index + 1, texts.get(index)));
    }

    void addTemplateSnapshotOptions(List<String> texts) {
        for (int index = 0; index < texts.size(); index++)
            templateSnapshotOptions.add(new PollTemplateSnapshotOptionEntity(this, index + 1, texts.get(index)));
    }
    void synchronizeVotes(List<de.justvotes.pollmanagement.core.model.Vote> desiredVotes) {
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
                votes.add(new VoteEntity(this, option, identity));
            } else {
                existingVote.replaceOption(option);
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

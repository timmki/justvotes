package de.justvotes.adapters.pollmanagement.infra.out.persistence;

public interface PollSummaryProjection {
    String getId();

    String getTitle();

    String getVisibility();

    String getState();

    String getCreatedAt();

    String getEndsAt();

    Long getTemplateGroupId();

    String getTemplateGroupName();

    String getTemplateGroupDescription();

    Integer getOptionNumber();

    String getOptionText();

    Integer getTemplateSnapshotOptionNumber();

    String getTemplateSnapshotOptionText();

    Long getTotalVotes();
}

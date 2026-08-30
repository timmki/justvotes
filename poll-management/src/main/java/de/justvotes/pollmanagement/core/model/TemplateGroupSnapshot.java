package de.justvotes.pollmanagement.core.model;

import java.util.List;

public record TemplateGroupSnapshot(Poll.TemplateGroupId id, String name, String description, List<String> optionTexts) {
    public TemplateGroupSnapshot {
        description = description == null ? "" : description.trim();
    }
}

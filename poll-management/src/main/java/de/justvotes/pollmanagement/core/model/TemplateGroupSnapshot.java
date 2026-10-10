package de.justvotes.pollmanagement.core.model;

import de.justvotes.pollmanagement.core.model.Poll.TemplateGroupId;

import java.util.List;

public record TemplateGroupSnapshot(TemplateGroupId id, String name, String description,
                                    List<String> optionTexts) {
    public TemplateGroupSnapshot {
        if (description == null) {
            description = "";
        } else {
            description = description.trim();
        }
    }
}

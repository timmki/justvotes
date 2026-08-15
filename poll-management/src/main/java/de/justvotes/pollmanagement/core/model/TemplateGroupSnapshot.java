package de.justvotes.pollmanagement.core.model;

import java.util.List;

public record TemplateGroupSnapshot(Poll.TemplateGroupId id, String name, List<String> optionTexts) {
}

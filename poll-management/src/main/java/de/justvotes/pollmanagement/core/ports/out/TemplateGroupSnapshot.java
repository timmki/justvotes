package de.justvotes.pollmanagement.core.ports.out;

import de.justvotes.pollmanagement.core.model.Poll;
import java.util.List;

public record TemplateGroupSnapshot(Poll.TemplateGroupId id, String name, List<String> optionTexts) { }

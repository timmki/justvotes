package de.justvotes.templatecatalog.core.model;

import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Set;

public final class OptionTemplate {
    private final OptionTemplateId id;
    private String name;
    private final Set<OptionTemplateGroup.OptionTemplateGroupId> groupReferences;

    public OptionTemplate(String name) {
        this(OptionTemplateId.empty(), name, Set.of());
    }

    public OptionTemplate(OptionTemplateId id, String name, Set<OptionTemplateGroup.OptionTemplateGroupId> groupReferences) {
        this.id = id;
        this.name = validateName(name);
        this.groupReferences = new LinkedHashSet<>(groupReferences);
    }

    public OptionTemplateId id() {
        return id;
    }

    public String name() {
        return name;
    }

    public Set<OptionTemplateGroup.OptionTemplateGroupId> groupReferences() {
        return Collections.unmodifiableSet(groupReferences);
    }

    public OptionTemplate rename(String name) {
        this.name = validateName(name);
        return this;
    }

    private String validateName(String name) {
        if (name == null || name.trim().isEmpty()) throw new IllegalArgumentException("An OptionTemplate name must not be blank.");
        return name.trim();
    }

    public record OptionTemplateId(long value) {

        public static OptionTemplateId of(long id) {
            return new OptionTemplateId(id);
        }

        public static OptionTemplateId empty() {
            return new OptionTemplateId(0);
        }

        public boolean isEmpty() {
            return value == 0;
        }
    }
}

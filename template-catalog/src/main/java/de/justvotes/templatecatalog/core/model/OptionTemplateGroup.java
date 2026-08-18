package de.justvotes.templatecatalog.core.model;

import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Set;

public final class OptionTemplateGroup {
    private final OptionTemplateGroupId id;
    private final Set<OptionTemplate.OptionTemplateId> templateReferences;
    private String name;
    private String description;

    public OptionTemplateGroup(String name, String description) {
        this(OptionTemplateGroupId.newId(), name, description, Set.of());
    }

    public OptionTemplateGroup(OptionTemplateGroupId id, String name, String description, Set<OptionTemplate.OptionTemplateId> templateReferences) {
        this.id = id;
        this.name = validateName(name);
        this.description = description == null ? "" : description.trim();
        this.templateReferences = new LinkedHashSet<>(templateReferences);
    }

    private static OptionTemplate.OptionTemplateId templateReference(long templateId) {
        return OptionTemplate.OptionTemplateId.of(templateId);
    }

    public OptionTemplateGroupId id() {
        return id;
    }

    public String name() {
        return name;
    }

    public String description() {
        return description;
    }

    public Set<OptionTemplate.OptionTemplateId> templateReferences() {
        return Collections.unmodifiableSet(templateReferences);
    }

    public OptionTemplateGroup addTemplate(OptionTemplate.OptionTemplateId templateId) {
        templateReferences.add(templateId);
        return this;
    }

    public OptionTemplateGroup removeTemplate(OptionTemplate.OptionTemplateId templateId) {
        templateReferences.remove(templateId);
        return this;
    }

    public OptionTemplateGroup rename(String name) {
        this.name = validateName(name);
        return this;
    }

    public OptionTemplateGroup description(String description) {
        this.description = description == null ? "" : description.trim();
        return this;
    }

    private String validateName(String name) {
        if (name == null || name.trim().isEmpty())
            throw new IllegalArgumentException("An OptionTemplateGroup name must not be blank.");
        return name.trim();
    }

    public record OptionTemplateGroupId(long value) {

        public static OptionTemplateGroupId of(long id) {
            return new OptionTemplateGroupId(id);
        }

        public static OptionTemplateGroupId newId() {
            return new OptionTemplateGroupId(0);
        }

        public boolean isNew() {
            return value == 0;
        }
    }
}

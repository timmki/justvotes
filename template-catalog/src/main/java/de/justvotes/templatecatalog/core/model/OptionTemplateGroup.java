package de.justvotes.templatecatalog.core.model;

import de.justvotes.templatecatalog.core.exception.CatalogItemManagedException;
import de.justvotes.templatecatalog.core.model.OptionTemplate.OptionTemplateId;

import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Set;

public final class OptionTemplateGroup {
    private final OptionTemplateGroupId id;
    private final Set<OptionTemplateId> templateReferences;
    private String name;
    private final TemplateGroupKind kind;
    private String description;

    public OptionTemplateGroup(String name, String description) {
        this(OptionTemplateGroupId.newId(), name, description, Set.of());
    }

    public OptionTemplateGroup(OptionTemplateGroupId id, String name, String description, Set<OptionTemplateId> templateReferences) {
        this(id, name, description, templateReferences, TemplateGroupKind.MANUAL);
    }

    public OptionTemplateGroup(OptionTemplateGroupId id, String name, String description, Set<OptionTemplateId> templateReferences, TemplateGroupKind kind) {
        this.id = id;
        this.kind = kind;
        this.name = validateName(name);
        if (description == null) {
            this.description = "";
        } else {
            this.description = description.trim();
        }
        this.templateReferences = new LinkedHashSet<>(templateReferences);
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

    public TemplateGroupKind kind() {
        return kind;
    }

    public boolean managed() {
        return kind == TemplateGroupKind.MEMBERS;
    }

    public Set<OptionTemplateId> templateReferences() {
        return Collections.unmodifiableSet(templateReferences);
    }

    public OptionTemplateGroup addTemplate(OptionTemplateId templateId) {
        requireUnmanaged();
        templateReferences.add(templateId);
        return this;
    }

    public OptionTemplateGroup removeTemplate(OptionTemplateId templateId) {
        requireUnmanaged();
        templateReferences.remove(templateId);
        return this;
    }

    /**
     * Adds a member's template; only the automatic synchronisation of the members group calls this.
     */
    public OptionTemplateGroup addMember(OptionTemplateId templateId) {
        if (!managed()) {
            throw new IllegalStateException("Only the members group holds member templates.");
        }
        templateReferences.add(templateId);
        return this;
    }

    public OptionTemplateGroup rename(String name) {
        requireUnmanaged();
        this.name = validateName(name);
        return this;
    }

    public void requireUnmanaged() {
        if (managed()) {
            throw new CatalogItemManagedException("Template group", id.value());
        }
    }

    public OptionTemplateGroup description(String description) {
        requireUnmanaged();
        if (description == null) {
            this.description = "";
        } else {
            this.description = description.trim();
        }
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

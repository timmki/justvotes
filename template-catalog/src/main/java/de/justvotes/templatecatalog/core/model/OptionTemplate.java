package de.justvotes.templatecatalog.core.model;

import de.justvotes.templatecatalog.core.exception.CatalogItemManagedException;
import de.justvotes.templatecatalog.core.model.OptionTemplateGroup.OptionTemplateGroupId;

import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Optional;
import java.util.Set;

public final class OptionTemplate {
    private final OptionTemplateId id;
    private final Set<OptionTemplateGroupId> groupReferences;
    private String name;
    private String memberIdentity;

    public OptionTemplate(String name) {
        this(OptionTemplateId.newId(), name, Set.of(), null);
    }

    public OptionTemplate(OptionTemplateId id, String name, Set<OptionTemplateGroupId> groupReferences) {
        this(id, name, groupReferences, null);
    }

    public OptionTemplate(OptionTemplateId id, String name, Set<OptionTemplateGroupId> groupReferences, String memberIdentity) {
        this.id = id;
        this.name = validateName(name);
        this.groupReferences = new LinkedHashSet<>(groupReferences);
        this.memberIdentity = memberIdentity;
    }

    public static OptionTemplate forMember(String identity) {
        return new OptionTemplate(OptionTemplateId.newId(), identity, Set.of(), identity.trim());
    }

    public OptionTemplateId id() {
        return id;
    }

    public String name() {
        return name;
    }

    public Set<OptionTemplateGroupId> groupReferences() {
        return Collections.unmodifiableSet(groupReferences);
    }

    public Optional<String> memberIdentity() {
        return Optional.ofNullable(memberIdentity);
    }

    public boolean managed() {
        return memberIdentity != null;
    }

    public OptionTemplate rename(String name) {
        requireUnmanaged();
        this.name = validateName(name);
        return this;
    }

    /**
     * Takes over an existing template with the identity's name as the member's template.
     */
    public OptionTemplate representMember(String identity) {
        this.memberIdentity = identity.trim();
        return this;
    }

    public void requireUnmanaged() {
        if (managed()) {
            throw new CatalogItemManagedException("Template", id.value());
        }
    }

    private String validateName(String name) {
        if (name == null || name.trim().isEmpty())
            throw new IllegalArgumentException("An OptionTemplate name must not be blank.");
        return name.trim();
    }

    public record OptionTemplateId(long value) {

        public static OptionTemplateId of(long id) {
            return new OptionTemplateId(id);
        }

        public static OptionTemplateId newId() {
            return new OptionTemplateId(0);
        }

        public boolean isNew() {
            return value == 0;
        }
    }
}

package de.justvotes.adapters.templatecatalog.infra.out.persistence;

import de.justvotes.templatecatalog.core.model.OptionTemplate.OptionTemplateId;
import de.justvotes.templatecatalog.core.model.OptionTemplateGroup.OptionTemplateGroupId;
import de.justvotes.templatecatalog.core.model.OptionTemplateGroup;
import de.justvotes.templatecatalog.core.ports.out.OptionTemplateGroupRepository;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

public final class JpaOptionTemplateGroupPersistenceAdapter implements OptionTemplateGroupRepository {
    private final SpringDataOptionTemplateRepository templates;
    private final SpringDataOptionTemplateGroupRepository groups;

    public JpaOptionTemplateGroupPersistenceAdapter(SpringDataOptionTemplateRepository templates,
                                                    SpringDataOptionTemplateGroupRepository groups) {
        this.templates = templates;
        this.groups = groups;
    }

    @Override
    public Optional<OptionTemplateGroup> findById(OptionTemplateGroupId id) {
        return groups.findById(id.value()).map(this::group);
    }

    @Override
    public Optional<OptionTemplateGroup> findByNormalizedName(String normalizedName) {
        return groups.findByNormalizedName(normalizedName).map(this::group);
    }

    @Override
    public List<OptionTemplateGroup> findAllReferencing(OptionTemplateId template) {
        return groups.findAllByTemplatesId(template.value()).stream().map(this::group).toList();
    }

    @Override
    public List<OptionTemplateGroup> findAll() {
        return groups.findAll().stream().map(this::group).toList();
    }

    @Override
    public OptionTemplateGroup save(OptionTemplateGroup group) {
        OptionTemplateGroupEntity entity;
        if (group.id().isNew()) {
            entity = new OptionTemplateGroupEntity(group.name(), group.description());
        } else {
            entity = groups.findById(group.id().value()).orElseThrow();
        }
        entity.rename(group.name());
        entity.templates().clear();
        entity.templates().addAll(group.templateReferences().stream()
                .map(reference -> templates.findById(reference.value()).orElseThrow())
                .collect(Collectors.toSet()));
        return group(groups.save(entity));
    }

    @Override
    public void delete(OptionTemplateGroup group) {
        groups.deleteById(group.id().value());
    }

    private OptionTemplateGroup group(OptionTemplateGroupEntity entity) {
        Set<OptionTemplateId> templateReferences = entity.templates().stream()
                .map(template -> OptionTemplateId.of(template.id()))
                .collect(Collectors.toUnmodifiableSet());
        return new OptionTemplateGroup(OptionTemplateGroupId.of(entity.id()), entity.name(), entity.description(), templateReferences);
    }
}

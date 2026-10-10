package de.justvotes.adapters.templatecatalog.infra.out.persistence;

import de.justvotes.templatecatalog.core.model.OptionTemplate.OptionTemplateId;
import de.justvotes.templatecatalog.core.model.OptionTemplate;
import de.justvotes.templatecatalog.core.model.OptionTemplateGroup.OptionTemplateGroupId;
import de.justvotes.templatecatalog.core.ports.out.OptionTemplateRepository;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

public final class JpaTemplateCatalogPersistenceAdapter implements OptionTemplateRepository {
    private final SpringDataOptionTemplateRepository templates;

    public JpaTemplateCatalogPersistenceAdapter(SpringDataOptionTemplateRepository templates) {
        this.templates = templates;
    }

    @Override
    public Optional<OptionTemplate> findById(OptionTemplateId id) {
        return templates.findById(id.value()).map(this::template);
    }

    @Override
    public Optional<OptionTemplate> findByNormalizedName(String normalizedName) {
        return templates.findByNormalizedName(normalizedName).map(this::template);
    }

    @Override
    public List<OptionTemplate> findAll() {
        return templates.findAll().stream().map(this::template).toList();
    }

    @Override
    public OptionTemplate save(OptionTemplate template) {
        OptionTemplateEntity entity;
        if (template.id().isNew()) {
            entity = new OptionTemplateEntity(template.name());
        } else {
            entity = templates.findById(template.id().value()).orElseThrow();
        }
        entity.rename(template.name());
        return template(templates.save(entity));
    }

    @Override
    public void delete(OptionTemplate template) {
        templates.deleteById(template.id().value());
    }

    private OptionTemplate template(OptionTemplateEntity entity) {
        Set<OptionTemplateGroupId> groupReferences = entity.groups().stream()
                .map(group -> OptionTemplateGroupId.of(group.id()))
                .collect(Collectors.toUnmodifiableSet());
        return new OptionTemplate(OptionTemplateId.of(entity.id()), entity.name(), groupReferences);
    }

}

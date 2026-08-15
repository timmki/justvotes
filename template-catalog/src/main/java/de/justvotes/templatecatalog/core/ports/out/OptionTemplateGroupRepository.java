package de.justvotes.templatecatalog.core.ports.out;

import de.justvotes.templatecatalog.core.model.OptionTemplate;
import de.justvotes.templatecatalog.core.model.OptionTemplateGroup;

import java.util.List;
import java.util.Optional;

public interface OptionTemplateGroupRepository {
    Optional<OptionTemplateGroup> findById(OptionTemplateGroup.OptionTemplateGroupId id);

    Optional<OptionTemplateGroup> findByNormalizedName(String normalizedName);

    List<OptionTemplateGroup> findAllReferencing(OptionTemplate.OptionTemplateId template);

    List<OptionTemplateGroup> findAll();

    OptionTemplateGroup save(OptionTemplateGroup group);

    void delete(OptionTemplateGroup group);
}

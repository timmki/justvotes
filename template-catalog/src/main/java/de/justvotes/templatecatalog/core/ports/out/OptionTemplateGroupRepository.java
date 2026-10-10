package de.justvotes.templatecatalog.core.ports.out;

import de.justvotes.templatecatalog.core.model.OptionTemplate.OptionTemplateId;
import de.justvotes.templatecatalog.core.model.OptionTemplateGroup;
import de.justvotes.templatecatalog.core.model.OptionTemplateGroup.OptionTemplateGroupId;

import java.util.List;
import java.util.Optional;

public interface OptionTemplateGroupRepository {
    Optional<OptionTemplateGroup> findById(OptionTemplateGroupId id);

    Optional<OptionTemplateGroup> findByNormalizedName(String normalizedName);

    List<OptionTemplateGroup> findAllReferencing(OptionTemplateId template);

    List<OptionTemplateGroup> findAll();

    OptionTemplateGroup save(OptionTemplateGroup group);

    void delete(OptionTemplateGroup group);
}

package de.justvotes.templatecatalog.core.ports.out;

import de.justvotes.templatecatalog.core.model.OptionTemplate;

import java.util.List;
import java.util.Optional;

public interface OptionTemplateRepository {
    Optional<OptionTemplate> findById(OptionTemplate.OptionTemplateId id);

    Optional<OptionTemplate> findByNormalizedName(String normalizedName);

    List<OptionTemplate> findAll();

    OptionTemplate save(OptionTemplate template);

    void delete(OptionTemplate template);
}

package de.justvotes.templatecatalog.core.ports.out;

import de.justvotes.templatecatalog.core.model.OptionTemplate;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface OptionTemplateRepository extends Repository<OptionTemplate, Integer> {
    Optional<OptionTemplate> findById(Integer id);
    @Query("select template from OptionTemplate template where lower(trim(template.name)) = :name")
    Optional<OptionTemplate> findByNormalizedName(@Param("name") String normalizedName);
    List<OptionTemplate> findAll();
    OptionTemplate save(OptionTemplate template);
    void delete(OptionTemplate template);
}

package de.justvotes.templatecatalog.core.ports.out;

import de.justvotes.templatecatalog.core.model.OptionTemplate;
import de.justvotes.templatecatalog.core.model.OptionTemplateGroup;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface OptionTemplateGroupRepository extends Repository<OptionTemplateGroup, Integer> {
    Optional<OptionTemplateGroup> findById(Integer id);
    @Query("select group from OptionTemplateGroup group where lower(trim(group.name)) = :name")
    Optional<OptionTemplateGroup> findByNormalizedName(@Param("name") String normalizedName);

    List<OptionTemplateGroup> findAllByTemplatesContaining(OptionTemplate template);
    List<OptionTemplateGroup> findAll();
    OptionTemplateGroup save(OptionTemplateGroup group);
    void delete(OptionTemplateGroup group);
}

package de.justvotes.adapters.templatecatalog.infra.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface SpringDataOptionTemplateRepository extends JpaRepository<OptionTemplateEntity, Long> {
    @Query("select template from OptionTemplateEntity template where lower(trim(template.name)) = :name")
    Optional<OptionTemplateEntity> findByNormalizedName(@Param("name") String normalizedName);
}

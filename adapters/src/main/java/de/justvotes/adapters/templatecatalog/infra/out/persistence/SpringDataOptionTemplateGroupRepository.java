package de.justvotes.adapters.templatecatalog.infra.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SpringDataOptionTemplateGroupRepository extends JpaRepository<OptionTemplateGroupEntity, Long> {
    @Query("select catalogGroup from OptionTemplateGroupEntity catalogGroup where lower(trim(catalogGroup.name)) = :name")
    Optional<OptionTemplateGroupEntity> findByNormalizedName(@Param("name") String normalizedName);

    List<OptionTemplateGroupEntity> findAllByTemplatesId(Long templateId);
}

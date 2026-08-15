package de.justvotes.bootstrap;

import de.justvotes.adapters.templatecatalog.infra.in.http.TemplateCatalogController;
import de.justvotes.templatecatalog.core.model.OptionTemplate;
import de.justvotes.templatecatalog.core.TemplateCatalogAdministration;
import de.justvotes.templatecatalog.core.ports.out.OptionTemplateGroupRepository;
import de.justvotes.templatecatalog.core.ports.out.OptionTemplateRepository;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@Configuration
@EntityScan(basePackageClasses = OptionTemplate.class)
@EnableJpaRepositories(basePackageClasses = OptionTemplateRepository.class)
class TemplateCatalogConfiguration {
    @Bean TemplateCatalogAdministration templateCatalogAdministration(OptionTemplateRepository templates,
                                                                       OptionTemplateGroupRepository groups) {
        return new TemplateCatalogAdministration(templates, groups);
    }

    @Bean TemplateCatalogController templateCatalogController(TemplateCatalogAdministration administration) {
        return new TemplateCatalogController(administration, administration);
    }
}

package de.justvotes.bootstrap.config;

import de.justvotes.adapters.templatecatalog.infra.in.http.TemplateCatalogController;
import de.justvotes.adapters.templatecatalog.infra.in.transaction.TransactionalTemplateCatalogAdministration;
import de.justvotes.adapters.templatecatalog.infra.out.persistence.JpaOptionTemplateGroupPersistenceAdapter;
import de.justvotes.adapters.templatecatalog.infra.out.persistence.JpaTemplateCatalogPersistenceAdapter;
import de.justvotes.adapters.templatecatalog.infra.out.persistence.SpringDataOptionTemplateGroupRepository;
import de.justvotes.adapters.templatecatalog.infra.out.persistence.SpringDataOptionTemplateRepository;
import de.justvotes.adapters.sqlite.SqliteRetryingTransaction;
import de.justvotes.templatecatalog.core.TemplateCatalogAdministration;
import de.justvotes.templatecatalog.core.ports.in.ManageTemplateCatalog;
import de.justvotes.templatecatalog.core.ports.in.ViewTemplateCatalog;
import de.justvotes.templatecatalog.core.ports.out.OptionTemplateGroupRepository;
import de.justvotes.templatecatalog.core.ports.out.OptionTemplateRepository;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@Configuration
@EntityScan(basePackages = "de.justvotes.adapters")
@EnableJpaRepositories(basePackages = "de.justvotes.adapters")
class TemplateCatalogConfiguration {
    @Bean
    OptionTemplateRepository optionTemplateRepository(SpringDataOptionTemplateRepository templates) {
        return new JpaTemplateCatalogPersistenceAdapter(templates);
    }

    @Bean
    OptionTemplateGroupRepository optionTemplateGroupRepository(SpringDataOptionTemplateRepository templates,
                                                                SpringDataOptionTemplateGroupRepository groups) {
        return new JpaOptionTemplateGroupPersistenceAdapter(templates, groups);
    }

    @Bean
    TemplateCatalogAdministration templateCatalogAdministration(OptionTemplateRepository templates,
                                                                OptionTemplateGroupRepository groups) {
        return new TemplateCatalogAdministration(templates, groups);
    }

    @Bean
    ManageTemplateCatalog templateCatalogCommands(TemplateCatalogAdministration administration,
                                                  SqliteRetryingTransaction transactions) {
        return new TransactionalTemplateCatalogAdministration(administration, administration, transactions);
    }

    @Bean
    ViewTemplateCatalog templateCatalogQueries(TemplateCatalogAdministration administration,
                                               SqliteRetryingTransaction transactions) {
        return new TransactionalTemplateCatalogAdministration(administration, administration, transactions);
    }

    @Bean
    TemplateCatalogController templateCatalogController(@Qualifier("templateCatalogCommands") ManageTemplateCatalog commands,
                                                        @Qualifier("templateCatalogQueries") ViewTemplateCatalog queries) {
        return new TemplateCatalogController(commands, queries);
    }
}

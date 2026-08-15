package de.justvotes.bootstrap.config;

import de.justvotes.adapters.pollmanagement.infra.in.http.PollController;
import de.justvotes.adapters.pollmanagement.infra.in.transaction.TransactionalPollManagement;
import de.justvotes.adapters.pollmanagement.infra.out.persistence.JpaPollPersistenceAdapter;
import de.justvotes.adapters.pollmanagement.infra.out.persistence.SpringDataPollRepository;
import de.justvotes.adapters.pollmanagement.infra.out.templatecatalog.TemplateCatalogSnapshotAdapter;
import de.justvotes.pollmanagement.core.PollManagement;
import de.justvotes.pollmanagement.core.ports.in.ManagePolls;
import de.justvotes.pollmanagement.core.ports.in.ViewPolls;
import de.justvotes.pollmanagement.core.ports.out.PollRepository;
import de.justvotes.pollmanagement.core.ports.out.TemplateGroupSnapshotProvider;
import de.justvotes.templatecatalog.core.ports.in.ViewTemplateCatalog;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
class PollManagementConfiguration {
    @Bean
    PollRepository pollRepository(SpringDataPollRepository polls) {
        return new JpaPollPersistenceAdapter(polls);
    }

    @Bean
    TemplateGroupSnapshotProvider templateGroupSnapshotProvider(@Qualifier("templateCatalogQueries") ViewTemplateCatalog catalog) {
        return new TemplateCatalogSnapshotAdapter(catalog);
    }

    @Bean
    PollManagement pollManagement(PollRepository polls, TemplateGroupSnapshotProvider groups) {
        return new PollManagement(polls, groups);
    }

    @Bean
    ManagePolls pollCommands(PollManagement management) {
        return new TransactionalPollManagement(management, management);
    }

    @Bean
    ViewPolls pollQueries(PollManagement management) {
        return new TransactionalPollManagement(management, management);
    }

    @Bean
    PollController pollController(@Qualifier("pollCommands") ManagePolls commands, @Qualifier("pollQueries") ViewPolls queries) {
        return new PollController(commands, queries);
    }
}

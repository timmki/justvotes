package de.justvotes.bootstrap.config;

import de.justvotes.adapters.pollmanagement.infra.in.http.IdentityController;
import de.justvotes.adapters.pollmanagement.infra.in.http.PollController;
import de.justvotes.adapters.pollmanagement.infra.in.http.PublicPollController;
import de.justvotes.adapters.pollmanagement.infra.in.scheduling.PollExpiryScheduler;
import de.justvotes.adapters.pollmanagement.infra.in.transaction.TransactionalPollManagement;
import de.justvotes.adapters.pollmanagement.infra.in.transaction.TransactionalVoteManagement;
import de.justvotes.adapters.pollmanagement.infra.out.persistence.*;
import de.justvotes.adapters.pollmanagement.infra.out.templatecatalog.TemplateCatalogSnapshotAdapter;
import de.justvotes.pollmanagement.core.PollManagement;
import de.justvotes.pollmanagement.core.VoteManagement;
import de.justvotes.pollmanagement.core.ports.in.ManagePolls;
import de.justvotes.pollmanagement.core.ports.in.ManageVotes;
import de.justvotes.pollmanagement.core.ports.in.ViewPolls;
import de.justvotes.pollmanagement.core.ports.in.ViewVotes;
import de.justvotes.pollmanagement.core.ports.out.*;
import de.justvotes.templatecatalog.core.ports.in.ViewTemplateCatalog;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
class PollManagementConfiguration {
    @Bean
    PollRepository pollRepository(SpringDataPollRepository polls, SpringDataPollDomainEventRepository events) {
        return new JpaPollPersistenceAdapter(polls, events);
    }

    @Bean
    TemplateGroupSnapshotProvider templateGroupSnapshotProvider(@Qualifier("templateCatalogQueries") ViewTemplateCatalog catalog) {
        return new TemplateCatalogSnapshotAdapter(catalog);
    }

    @Bean
    PollEventPublisher pollEventPublisher(SpringDataPollDomainEventRepository events) {
        return new JpaPollEventPublisher(events);
    }

    @Bean
    PollAuditRepository pollAuditRepository(SpringDataPollDomainEventRepository events) {
        return new JpaPollAuditAdapter(events);
    }

    @Bean
    PollManagement pollManagement(PollRepository polls, TemplateGroupSnapshotProvider groups, PollEventPublisher events) {
        return new PollManagement(polls, groups, events);
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
    de.justvotes.pollmanagement.core.ports.out.UtcClock utcClock() {
        return java.time.Instant::now;
    }

    @Bean
    VoteManagement voteManagement(PollRepository polls, PollAuditRepository audit, PollEventPublisher events,
                                  de.justvotes.pollmanagement.core.ports.out.UtcClock clock) {
        return new VoteManagement(polls, audit, events, clock);
    }

    @Bean
    ManageVotes voteCommands(VoteManagement management) {
        return new TransactionalVoteManagement(management, management);
    }

    @Bean
    ViewVotes voteQueries(VoteManagement management) {
        return new TransactionalVoteManagement(management, management);
    }

    @Bean
    PollController pollController(@Qualifier("pollCommands") ManagePolls commands, @Qualifier("pollQueries") ViewPolls queries) {
        return new PollController(commands, queries);
    }

    @Bean
    PublicPollController publicPollController(@Qualifier("pollQueries") ViewPolls queries, @Qualifier("voteCommands") ManageVotes votes, @Qualifier("voteQueries") ViewVotes voteQueries) {
        return new PublicPollController(queries, votes, voteQueries);
    }

    @Bean
    IdentityController identityController(@Qualifier("voteCommands") ManageVotes votes) {
        return new IdentityController(votes);
    }

    @Bean
    PollExpiryScheduler pollExpiryScheduler(@Qualifier("pollCommands") ManagePolls commands) {
        return new PollExpiryScheduler(commands);
    }
}

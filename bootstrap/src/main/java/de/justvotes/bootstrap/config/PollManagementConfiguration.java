package de.justvotes.bootstrap.config;

import de.justvotes.adapters.pollmanagement.infra.in.http.AdministrativeVoteController;
import de.justvotes.adapters.pollmanagement.infra.in.http.IdentityController;
import de.justvotes.adapters.pollmanagement.infra.in.http.PollController;
import de.justvotes.adapters.pollmanagement.infra.in.http.PublicPollController;
import de.justvotes.adapters.pollmanagement.infra.in.scheduling.PollExpiryScheduler;
import de.justvotes.adapters.pollmanagement.infra.in.transaction.TransactionalAdminVoteManagement;
import de.justvotes.adapters.pollmanagement.infra.in.transaction.TransactionalPollManagement;
import de.justvotes.adapters.pollmanagement.infra.in.transaction.TransactionalVoteManagement;
import de.justvotes.adapters.pollmanagement.infra.out.persistence.*;
import de.justvotes.adapters.pollmanagement.infra.out.templatecatalog.TemplateCatalogSnapshotAdapter;
import de.justvotes.pollmanagement.core.PollManagement;
import de.justvotes.pollmanagement.core.VoteManagement;
import de.justvotes.pollmanagement.core.ports.in.*;
import de.justvotes.pollmanagement.core.ports.out.*;
import de.justvotes.templatecatalog.core.ports.in.ViewTemplateCatalog;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Instant;

@Configuration
class PollManagementConfiguration {
    @Bean
    PollRepository pollRepository(SpringDataPollRepository polls, SpringDataPollDomainEventRepository events,
                                  SpringDataVoteRepository votes) {
        return new JpaPollPersistenceAdapter(polls, events, votes);
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
    PollManagement pollManagement(PollRepository polls, TemplateGroupSnapshotProvider groups, PollEventPublisher events,
                                  UtcClock clock) {
        return new PollManagement(polls, groups, events, clock);
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
    UtcClock utcClock() {
        return Instant::now;
    }

    @Bean
    VoteManagement voteManagement(PollRepository polls, PollAuditRepository audit, PollEventPublisher events,
                                  UtcClock clock) {
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
    ManageAdminVotes adminVoteCommands(VoteManagement management) {
        return new TransactionalAdminVoteManagement(management, management);
    }

    @Bean
    ViewAdminVotes adminVoteQueries(VoteManagement management) {
        return new TransactionalAdminVoteManagement(management, management);
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
    AdministrativeVoteController administrativeVoteController(@Qualifier("adminVoteQueries") ViewAdminVotes queries,
                                                              @Qualifier("adminVoteCommands") ManageAdminVotes commands) {
        return new AdministrativeVoteController(queries, commands);
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

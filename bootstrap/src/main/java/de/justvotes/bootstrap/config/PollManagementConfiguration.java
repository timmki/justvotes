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
import de.justvotes.adapters.sqlite.SqliteRetryingTransaction;
import de.justvotes.pollmanagement.core.PollManagement;
import de.justvotes.pollmanagement.core.VoteManagement;
import de.justvotes.pollmanagement.core.ports.in.*;
import de.justvotes.pollmanagement.core.ports.out.*;
import de.justvotes.templatecatalog.core.ports.in.ViewTemplateCatalog;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;

import java.time.Instant;

@Configuration
class PollManagementConfiguration {
    @Bean
    SqliteRetryingTransaction sqliteRetryingTransaction(PlatformTransactionManager transactionManager) {
        return new SqliteRetryingTransaction(transactionManager);
    }

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
    ManagePolls pollCommands(PollManagement management, SqliteRetryingTransaction transactions) {
        return new TransactionalPollManagement(management, management, transactions);
    }

    @Bean
    ViewPolls pollQueries(PollManagement management, SqliteRetryingTransaction transactions) {
        return new TransactionalPollManagement(management, management, transactions);
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
    ManageVotes voteCommands(VoteManagement management, SqliteRetryingTransaction transactions) {
        return new TransactionalVoteManagement(management, management, transactions);
    }

    @Bean
    ViewVotes voteQueries(VoteManagement management, SqliteRetryingTransaction transactions) {
        return new TransactionalVoteManagement(management, management, transactions);
    }

    @Bean
    ManageAdminVotes adminVoteCommands(VoteManagement management, SqliteRetryingTransaction transactions) {
        return new TransactionalAdminVoteManagement(management, management, transactions);
    }

    @Bean
    ViewAdminVotes adminVoteQueries(VoteManagement management, SqliteRetryingTransaction transactions) {
        return new TransactionalAdminVoteManagement(management, management, transactions);
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

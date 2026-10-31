package de.justvotes.adapters.accountmanagement.infra.in.http;

import de.justvotes.accountmanagement.core.model.Account;
import de.justvotes.accountmanagement.core.model.AccountId;
import de.justvotes.accountmanagement.core.ports.in.ManageAccounts;
import de.justvotes.accountmanagement.core.ports.in.ViewAccounts;
import de.justvotes.adapters.shared.infra.in.http.AuthenticatedAccounts;
import de.justvotes.adapters.shared.infra.in.http.OpaqueIdCodec;
import de.justvotes.adapters.shared.infra.in.http.SecurityEventLogger;
import de.justvotes.api.v1.model.AccountSummary;
import de.justvotes.api.v1.model.OneTimePassword;
import de.justvotes.api.v1.server.AccountAdministrationApi;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class AdminAccountController implements AccountAdministrationApi {
    private final ManageAccounts commands;
    private final ViewAccounts queries;
    private final SecurityEventLogger securityEvents;

    public AdminAccountController(ManageAccounts commands, ViewAccounts queries, SecurityEventLogger securityEvents) {
        this.commands = commands;
        this.queries = queries;
        this.securityEvents = securityEvents;
    }

    private static AccountId accountId(String value) {
        return AccountId.of(OpaqueIdCodec.decode(AccountResponseMapper.ACCOUNT_ID_KIND, value));
    }

    private static <T> ResponseEntity<T> noStore(T body) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body);
    }

    @Override
    public ResponseEntity<List<AccountSummary>> accounts() {
        return noStore(queries.accounts().stream().map(AccountResponseMapper::summary).toList());
    }

    @Override
    public ResponseEntity<AccountSummary> lockAccount(String accountId) {
        Account account = commands.lock(accountId(accountId));
        securityEvents.accountLocked(account.id().orElseThrow().value(),
                AuthenticatedAccounts.current().accountId());
        return noStore(AccountResponseMapper.summary(account));
    }

    @Override
    public ResponseEntity<AccountSummary> unlockAccount(String accountId) {
        Account account = commands.unlock(accountId(accountId));
        securityEvents.accountUnlocked(account.id().orElseThrow().value(),
                AuthenticatedAccounts.current().accountId());
        return noStore(AccountResponseMapper.summary(account));
    }

    @Override
    public ResponseEntity<OneTimePassword> assignOneTimePassword(String accountId) {
        AccountId id = accountId(accountId);
        String password = commands.assignOneTimePassword(id);
        Account account = queries.account(id).orElseThrow();
        securityEvents.oneTimePasswordSet(id.value(), AuthenticatedAccounts.current().accountId());
        return noStore(new OneTimePassword(password));
    }
}

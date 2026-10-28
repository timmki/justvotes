package de.justvotes.adapters.shared.infra.in.http;

/**
 * The signed-in account of the current request, set after the session has been validated.
 *
 * @param identity the fixed voting identity, or {@code null} for the administrator account
 */
public record AuthenticatedAccount(long accountId, String accountName, String role, String identity) {
    public static final String REQUEST_ATTRIBUTE = AuthenticatedAccount.class.getName();
    public static final String ROLE_USER = "user";
    public static final String ROLE_ADMIN = "admin";

    public boolean isAdmin() {
        return ROLE_ADMIN.equals(role);
    }
}

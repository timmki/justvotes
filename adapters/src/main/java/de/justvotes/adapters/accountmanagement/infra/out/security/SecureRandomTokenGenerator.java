package de.justvotes.adapters.accountmanagement.infra.out.security;

import de.justvotes.accountmanagement.core.model.InvitationToken;
import de.justvotes.accountmanagement.core.ports.out.TokenGenerator;

import java.security.SecureRandom;
import java.util.Base64;

public final class SecureRandomTokenGenerator implements TokenGenerator {
    private static final int TOKEN_BYTES = 32;
    private static final int ONE_TIME_PASSWORD_LENGTH = 16;
    private static final String ONE_TIME_PASSWORD_ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
    private final SecureRandom random = new SecureRandom();

    @Override
    public InvitationToken invitationToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        random.nextBytes(bytes);
        return InvitationToken.of(Base64.getUrlEncoder().withoutPadding().encodeToString(bytes));
    }

    @Override
    public String oneTimePassword() {
        StringBuilder password = new StringBuilder(ONE_TIME_PASSWORD_LENGTH);
        for (int index = 0; index < ONE_TIME_PASSWORD_LENGTH; index++) {
            password.append(ONE_TIME_PASSWORD_ALPHABET.charAt(random.nextInt(ONE_TIME_PASSWORD_ALPHABET.length())));
        }
        return password.toString();
    }
}

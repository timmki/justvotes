package de.justvotes.adapters.pollmanagement.infra.in.http;

import de.justvotes.pollmanagement.core.model.Identity;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

final class IdentityCookieCodec {
    static final String NAME = "userID";
    private static final String PREFIX = "v2.";

    private IdentityCookieCodec() {
    }

    static String encode(Identity identity) {
        return PREFIX + Base64.getUrlEncoder().withoutPadding().encodeToString(identity.value().getBytes(StandardCharsets.UTF_8));
    }

    static Identity decode(String value) {
        if (!value.startsWith(PREFIX)) return Identity.of(value);
        String decoded = new String(Base64.getUrlDecoder().decode(value.substring(PREFIX.length())), StandardCharsets.UTF_8);
        return Identity.of(decoded);
    }
}

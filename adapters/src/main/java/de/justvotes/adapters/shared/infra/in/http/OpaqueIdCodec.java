package de.justvotes.adapters.shared.infra.in.http;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * Maps context-internal numeric identifiers to stable HTTP identifiers.
 */
public final class OpaqueIdCodec {
    private OpaqueIdCodec() {
    }

    public static String encode(String kind, long value) {
        if (value < 0) throw new IllegalArgumentException("An identifier must not be negative.");
        byte[] bytes = ByteBuffer.allocate(Long.BYTES).putLong(value).array();
        return kind + "_v1_" + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public static long decode(String expectedKind, String value) {
        byte[] bytes = decodeBytes(expectedKind, value);
        if (bytes.length != Long.BYTES) throw invalid(expectedKind);
        long decoded = ByteBuffer.wrap(bytes).getLong();
        if (decoded < 0) throw invalid(expectedKind);
        return decoded;
    }

    public static String encode(String kind, String value) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException("An identifier must not be blank.");
        return kind + "_v1_" + Base64.getUrlEncoder().withoutPadding().encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }

    public static String decodeString(String expectedKind, String value) {
        String decoded = new String(decodeBytes(expectedKind, value), StandardCharsets.UTF_8);
        if (decoded.isBlank()) throw invalid(expectedKind);
        return decoded;
    }

    private static byte[] decodeBytes(String expectedKind, String value) {
        String prefix = expectedKind + "_v1_";
        if (value == null || !value.startsWith(prefix)) {
            throw invalid(expectedKind);
        }
        try {
            byte[] bytes = Base64.getUrlDecoder().decode(value.substring(prefix.length()));
            if (bytes.length == 0) throw invalid(expectedKind);
            return bytes;
        } catch (IllegalArgumentException exception) {
            throw invalid(expectedKind, exception);
        }
    }

    private static IllegalArgumentException invalid(String kind) {
        return new IllegalArgumentException("Invalid " + kind + " identifier.");
    }

    private static IllegalArgumentException invalid(String kind, Exception cause) {
        return new IllegalArgumentException("Invalid " + kind + " identifier.", cause);
    }
}

package de.justvotes.adapters.shared.infra.in.http;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class OpaqueIdCodecTest {
    @Test
    void roundTripsTypedIdentifier() {
        String id = OpaqueIdCodec.encode("p", 42L);
        assertEquals(42L, OpaqueIdCodec.decode("p", id));
    }

    @Test
    void roundTripsPollUuidWithoutExposingIt() {
        String opaqueId = OpaqueIdCodec.encode("p", "550e8400-e29b-41d4-a716-446655440000");
        assertEquals("550e8400-e29b-41d4-a716-446655440000", OpaqueIdCodec.decodeString("p", opaqueId));
    }

    @Test
    void supportsAllPublishedIdentifierKindsAtNumericBoundaries() {
        assertEquals(0L, OpaqueIdCodec.decode("g", OpaqueIdCodec.encode("g", 0L)));
        assertEquals(Long.MAX_VALUE, OpaqueIdCodec.decode("t", OpaqueIdCodec.encode("t", Long.MAX_VALUE)));
    }

    @Test
    void rejectsWrongKindAndMalformedValues() {
        assertThrows(IllegalArgumentException.class, () -> OpaqueIdCodec.decode("g", "p_v1_AAAAAAAAACo"));
        assertThrows(IllegalArgumentException.class, () -> OpaqueIdCodec.decode("p", "p_v1_not-base64!"));
    }
}

package de.justvotes.accountmanagement.core.model;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ValueObjectsTest {
    @Test
    void emailAddressRequiresExactlyOneAtWithTextAround() {
        assertEquals("anna@example.test", EmailAddress.of("Anna@Example.TEST").normalized());
        assertThrows(IllegalArgumentException.class, () -> EmailAddress.of("a@"));
        assertThrows(IllegalArgumentException.class, () -> EmailAddress.of("@example.test"));
        assertThrows(IllegalArgumentException.class, () -> EmailAddress.of("a@b@c"));
        assertThrows(IllegalArgumentException.class, () -> EmailAddress.of("example.test"));
        assertThrows(IllegalArgumentException.class, () -> EmailAddress.of("x".repeat(250) + "@a.de"));
        assertThrows(IllegalArgumentException.class, () -> EmailAddress.of(" a@b.de"));
    }

    @Test
    void identityAllowsOneToSixtyFourCodePointsWithoutSurroundingWhitespace() {
        assertDoesNotThrow(() -> AccountIdentity.of("Ä"));
        assertDoesNotThrow(() -> AccountIdentity.of("Älice #1"));
        assertDoesNotThrow(() -> AccountIdentity.of("😀".repeat(64)));
        assertEquals("älice #1", AccountIdentity.of("Älice #1").normalized());
        assertThrows(IllegalArgumentException.class, () -> AccountIdentity.of(""));
        assertThrows(IllegalArgumentException.class, () -> AccountIdentity.of("x".repeat(65)));
        assertThrows(IllegalArgumentException.class, () -> AccountIdentity.of(" alice"));
        assertThrows(IllegalArgumentException.class, () -> AccountIdentity.of("alice "));
    }

    @Test
    void passwordRequiresTwelveToOneHundredTwentyEightCodePoints() {
        assertDoesNotThrow(() -> Password.of("a".repeat(12)));
        assertDoesNotThrow(() -> Password.of("ä".repeat(64)));
        assertDoesNotThrow(() -> Password.of("b".repeat(128)));
        assertThrows(IllegalArgumentException.class, () -> Password.of("a".repeat(11)));
        assertThrows(IllegalArgumentException.class, () -> Password.of("a".repeat(129)));
        assertThrows(IllegalArgumentException.class, () -> Password.of(" ".repeat(12)));
        assertFalse(Password.of("secret-secret").toString().contains("secret"));
    }

    @Test
    void invitationTokenHashIsSha256Hex() {
        InvitationTokenHash hash = InvitationToken.of("abc").hash();
        assertEquals("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", hash.value());
    }

    @Test
    void suggestedIdentityComesFromContactNamesWithinIdentityRules() {
        assertEquals("Anna Beispiel", SuggestedIdentity.fromContactName("  Anna Beispiel ").orElseThrow().value());
        assertTrue(SuggestedIdentity.fromContactName("   ").isEmpty());
        assertTrue(SuggestedIdentity.fromContactName(null).isEmpty());
        String tooLong = "😀".repeat(65);
        String cut = SuggestedIdentity.fromContactName(tooLong).orElseThrow().value();
        assertEquals(64, cut.codePointCount(0, cut.length()));
        assertEquals("a".repeat(63), SuggestedIdentity.fromContactName("a".repeat(63) + " b").orElseThrow().value());
        assertThrows(IllegalArgumentException.class, () -> SuggestedIdentity.of(" Anna"));
    }
}

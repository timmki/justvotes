package de.justvotes.accountmanagement.core.model;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ValueObjectsTest {
    @Test
    void accountNameAcceptsThreeToThirtyTwoAllowedCharacters() {
        assertDoesNotThrow(() -> AccountName.of("ann"));
        assertDoesNotThrow(() -> AccountName.of("a".repeat(32)));
        assertDoesNotThrow(() -> AccountName.of("Anna.M_1-x"));
        assertEquals("anna.m_1-x", AccountName.of("Anna.M_1-x").normalized());
    }

    @Test
    void accountNameRejectsInvalidValues() {
        assertThrows(IllegalArgumentException.class, () -> AccountName.of(null));
        assertThrows(IllegalArgumentException.class, () -> AccountName.of("ab"));
        assertThrows(IllegalArgumentException.class, () -> AccountName.of("a".repeat(33)));
        assertThrows(IllegalArgumentException.class, () -> AccountName.of("anna maria"));
        assertThrows(IllegalArgumentException.class, () -> AccountName.of("Änna"));
        assertThrows(IllegalArgumentException.class, () -> AccountName.of("12345"));
    }

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
}

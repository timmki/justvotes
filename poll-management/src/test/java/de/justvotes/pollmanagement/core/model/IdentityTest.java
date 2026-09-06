package de.justvotes.pollmanagement.core.model;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class IdentityTest {
    @Test
    void preservesCaseWhitespaceUnicodeAndPunctuation() {
        String value = " ÄÖ / #42! ";

        assertEquals(value, Identity.of(value).value());
    }

    @Test
    void acceptsAtMost64UnicodeCharacters() {
        String value = "😀".repeat(64);

        assertEquals(value, Identity.of(value).value());
    }

    @Test
    void rejectsEmptyAndOverlongValues() {
        assertThrows(IllegalArgumentException.class, () -> Identity.of(""));
        assertThrows(IllegalArgumentException.class, () -> Identity.of("😀".repeat(65)));
    }
}

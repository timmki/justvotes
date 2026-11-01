package de.justvotes.adapters.accountmanagement.infra.in.vcard;

import de.justvotes.accountmanagement.core.exception.ContactImportInvalidException;
import de.justvotes.accountmanagement.core.exception.ContactImportTooManyException;
import de.justvotes.accountmanagement.core.model.ContactCandidate;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class VCardContactReaderTest {
    private final VCardContactReader reader = new VCardContactReader();

    private static String fixture() throws IOException {
        try (InputStream file = VCardContactReaderTest.class.getResourceAsStream("/vcard/contacts.vcf")) {
            return new String(file.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private static String card(String... lines) {
        return "BEGIN:VCARD\r\nVERSION:4.0\r\n" + String.join("\r\n", lines) + "\r\nEND:VCARD\r\n";
    }

    private ContactCandidate single(String... lines) {
        return reader.read(card(lines)).contacts().getFirst();
    }

    @Test
    void readsNamesAndPreferredAddressesOfTheFixture() throws IOException {
        VCardContactReader.Reading reading = reader.read(fixture());

        assertEquals(0, reading.unreadableEntries());
        assertEquals(List.of(
                new ContactCandidate(1, Optional.of("Anna Beispiel"), Optional.of("anna@example.test")),
                new ContactCandidate(2, Optional.of("Bert Muster"), Optional.of("bert@example.test")),
                new ContactCandidate(3, Optional.of("Jörg Ümlaut-Straß"), Optional.of("joerg@example.test")),
                new ContactCandidate(4, Optional.of("Clara van der Test mit einem sehr langen Namen"),
                        Optional.of("clara@example.test")),
                new ContactCandidate(5, Optional.of("Ohne Adresse"), Optional.empty()),
                new ContactCandidate(6, Optional.of("Kaputt"), Optional.of("kein-at-zeichen")),
                new ContactCandidate(7, Optional.of("Anna Doppelt"), Optional.of("ANNA@example.test"))),
                reading.contacts());
    }

    @Test
    void choosesThePreferredAddressOfVersionFourAndThree() {
        assertEquals("b@example.test", single("EMAIL;PREF=2:a@example.test", "EMAIL;PREF=1:b@example.test").email().orElseThrow());
        assertEquals("b@example.test", single("EMAIL:a@example.test", "EMAIL;TYPE=INTERNET,pref:b@example.test").email().orElseThrow());
        assertEquals("a@example.test", single("EMAIL:a@example.test", "EMAIL:b@example.test").email().orElseThrow());
    }

    @Test
    void handlesGroupsEscapesCaseAndStructuredNames() {
        ContactCandidate grouped = single("item1.email;type=home:grouped@example.test", "fn:Müller\\, Anna");
        assertEquals("Müller, Anna", grouped.name().orElseThrow());
        assertEquals("grouped@example.test", grouped.email().orElseThrow());
        assertEquals("Clara van der Test", single("N:van der Test;Clara;;;", "EMAIL:c@example.test").name().orElseThrow());
        assertEquals("Quoted", single("FN;LABEL=\"a:b\":Quoted").name().orElseThrow());
    }

    @Test
    void ignoresEveryOtherProperty() {
        ContactCandidate contact = single("FN:Anna", "TEL;TYPE=CELL:0000", "ADR;TYPE=HOME:;;Weg 1;Stadt;;12345;DE",
                "BDAY;VALUE=DATE:2000-01-01", "UID:x", "NOTE:EMAIL:not-an-address");
        assertEquals(new ContactCandidate(1, Optional.of("Anna"), Optional.empty()), contact);
    }

    @Test
    void countsCardsWithoutEndAsUnreadable() {
        VCardContactReader.Reading reading = reader.read(card("FN:Anna", "EMAIL:a@example.test")
                + "BEGIN:VCARD\r\nFN:Cut\r\n" + card("FN:Bert", "EMAIL:b@example.test") + "BEGIN:VCARD\nFN:Tail\n");
        assertEquals(2, reading.unreadableEntries());
        assertEquals(List.of("Anna", "Bert"), reading.contacts().stream().map(contact -> contact.name().orElseThrow()).toList());
        assertEquals(2, reading.contacts().get(1).position());
    }

    @Test
    void rejectsFilesWithoutContactsAndTooManyContacts() {
        assertThrows(ContactImportInvalidException.class, () -> reader.read("Hallo Welt"));
        assertThrows(ContactImportInvalidException.class, () -> reader.read(""));
        assertThrows(ContactImportInvalidException.class, () -> reader.read("BEGIN:VCARD\r\nFN:Cut\r\n"));
        assertTrue(reader.read("﻿" + card("FN:Bom", "EMAIL:bom@example.test")).contacts().size() == 1);
        String many = card("FN:X", "EMAIL:x@example.test").repeat(ContactImportTooManyException.MAX_CONTACTS);
        assertEquals(500, reader.read(many).contacts().size());
        assertThrows(ContactImportTooManyException.class, () -> reader.read(many + card("FN:Y")));
    }
}

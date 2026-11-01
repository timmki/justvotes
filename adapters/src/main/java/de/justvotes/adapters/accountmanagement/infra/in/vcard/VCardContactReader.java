package de.justvotes.adapters.accountmanagement.infra.in.vcard;

import de.justvotes.accountmanagement.core.exception.ContactImportInvalidException;
import de.justvotes.accountmanagement.core.exception.ContactImportTooManyException;
import de.justvotes.accountmanagement.core.model.ContactCandidate;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Reads the name and preferred email address of every contact in a vCard 3.0 or 4.0 file. All other
 * properties are skipped without being interpreted, so phone numbers, addresses or birthdays never leave
 * this class.
 */
public final class VCardContactReader {
    private static final int UNRANKED = Integer.MAX_VALUE;

    /**
     * Contacts in file order and the number of entries that were cut off before {@code END:VCARD}.
     */
    public record Reading(List<ContactCandidate> contacts, int unreadableEntries) {
    }

    private record Property(String name, List<String> parameters, String value) {
    }

    private static final class Card {
        private String formattedName;
        private String structuredName;
        private String email;
        private int emailRank = UNRANKED;
        private int emailCount;

        void add(Property property) {
            switch (property.name()) {
                case "FN" -> formattedName = unescape(property.value());
                case "N" -> structuredName = structuredName(property.value());
                case "EMAIL" -> addEmail(property);
                default -> {
                    // Only name and email address are evaluated (FR-003).
                }
            }
        }

        private void addEmail(Property property) {
            String value = unescape(property.value()).strip();
            if (value.isEmpty()) {
                return;
            }
            int rank = rank(property.parameters(), emailCount++);
            if (email == null || rank < emailRank) {
                email = value;
                emailRank = rank;
            }
        }

        ContactCandidate candidate(int position) {
            String name = formattedName;
            if (name == null || name.isBlank()) {
                name = structuredName;
            }
            return new ContactCandidate(position, Optional.ofNullable(name), Optional.ofNullable(email));
        }
    }

    public Reading read(String content) {
        if (content == null) {
            throw new ContactImportInvalidException();
        }
        List<ContactCandidate> contacts = new ArrayList<>();
        int unreadable = 0;
        boolean sawCard = false;
        Card card = null;
        for (String line : unfold(content)) {
            Property property = parse(line);
            if (property == null) {
                continue;
            }
            if (property.name().equals("BEGIN") && property.value().equalsIgnoreCase("VCARD")) {
                sawCard = true;
                if (card != null) {
                    unreadable++;
                }
                card = new Card();
            } else if (property.name().equals("END") && property.value().equalsIgnoreCase("VCARD")) {
                if (card != null) {
                    if (contacts.size() == ContactImportTooManyException.MAX_CONTACTS) {
                        throw new ContactImportTooManyException();
                    }
                    contacts.add(card.candidate(contacts.size() + 1));
                }
                card = null;
            } else if (card != null) {
                card.add(property);
            }
        }
        if (card != null) {
            unreadable++;
        }
        if (!sawCard || contacts.isEmpty()) {
            throw new ContactImportInvalidException();
        }
        return new Reading(List.copyOf(contacts), unreadable);
    }

    /**
     * Joins continuation lines (starting with a space or tab) to the previous line, removing the one
     * folding whitespace character.
     */
    private static List<String> unfold(String content) {
        String text = content;
        if (text.startsWith("﻿")) {
            text = text.substring(1);
        }
        List<String> lines = new ArrayList<>();
        StringBuilder current = null;
        for (String raw : text.split("\r\n|\n|\r", -1)) {
            if (!raw.isEmpty() && (raw.charAt(0) == ' ' || raw.charAt(0) == '\t') && current != null) {
                current.append(raw, 1, raw.length());
                continue;
            }
            if (current != null) {
                lines.add(current.toString());
            }
            current = new StringBuilder(raw);
        }
        if (current != null) {
            lines.add(current.toString());
        }
        return lines;
    }

    private static Property parse(String line) {
        int colon = valueSeparator(line);
        if (colon < 0) {
            return null;
        }
        String[] head = line.substring(0, colon).split(";");
        String name = head[0];
        int group = name.lastIndexOf('.');
        if (group >= 0) {
            name = name.substring(group + 1);
        }
        List<String> parameters = new ArrayList<>();
        for (int index = 1; index < head.length; index++) {
            parameters.add(head[index].toUpperCase(Locale.ROOT));
        }
        return new Property(name.strip().toUpperCase(Locale.ROOT), parameters, line.substring(colon + 1));
    }

    /**
     * The first colon outside a quoted parameter value separates name and value.
     */
    private static int valueSeparator(String line) {
        boolean quoted = false;
        for (int index = 0; index < line.length(); index++) {
            char character = line.charAt(index);
            if (character == '"') {
                quoted = !quoted;
            } else if (character == ':' && !quoted) {
                return index;
            }
        }
        return -1;
    }

    /**
     * vCard 4.0 {@code PREF=1} ranks highest, then vCard 3.0 {@code TYPE=pref}, then file order.
     */
    private static int rank(List<String> parameters, int order) {
        for (String parameter : parameters) {
            if (parameter.startsWith("PREF=")) {
                try {
                    return Integer.parseInt(parameter.substring(5).strip());
                } catch (NumberFormatException exception) {
                    return 101;
                }
            }
        }
        for (String parameter : parameters) {
            if (parameter.startsWith("TYPE=") && List.of(parameter.substring(5).split(",")).contains("PREF")) {
                return 101;
            }
        }
        return 1_000 + order;
    }

    /**
     * {@code N} is {@code family;given;additional;prefix;suffix}; it is shown as "given family".
     */
    private static String structuredName(String value) {
        String[] parts = value.split("(?<!\\\\);", -1);
        String family = unescape(parts[0]).strip();
        String given = "";
        if (parts.length > 1) {
            given = unescape(parts[1]).strip();
        }
        String name = (given + " " + family).strip();
        if (name.isEmpty()) {
            return null;
        }
        return name;
    }

    private static String unescape(String value) {
        StringBuilder result = new StringBuilder(value.length());
        for (int index = 0; index < value.length(); index++) {
            char character = value.charAt(index);
            if (character == '\\' && index + 1 < value.length()) {
                char next = value.charAt(++index);
                if (next == 'n' || next == 'N') {
                    result.append(' ');
                } else {
                    result.append(next);
                }
            } else {
                result.append(character);
            }
        }
        return result.toString();
    }
}

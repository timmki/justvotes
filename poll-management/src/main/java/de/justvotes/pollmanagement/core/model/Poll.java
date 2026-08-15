package de.justvotes.pollmanagement.core.model;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

public final class Poll {
    private final PollId id;
    private final String title;
    private final String createdBy;
    private final Visibility visibility;
    private final TemplateGroup templateGroup;
    private final List<Option> templateSnapshotOptions;
    private State state;
    private List<Option> options;

    public Poll(String title, String createdBy, TemplateGroup templateGroup, List<String> optionTexts) {
        this(PollId.newId(), title, createdBy, Visibility.PRIVATE, State.DRAFT, templateGroup, optionTexts, optionTexts);
    }

    public Poll(PollId id, String title, String createdBy, Visibility visibility, State state, TemplateGroup templateGroup, List<String> templateSnapshotOptionTexts, List<String> optionTexts) {
        this.id = id;
        this.title = requiredText(title, "A poll title must not be blank.");
        this.createdBy = requiredText(createdBy, "A poll creator must not be blank.");
        this.visibility = visibility;
        this.state = state;
        if (templateGroup == null) throw new IllegalArgumentException("A poll must have a template group.");
        this.templateGroup = templateGroup;
        this.templateSnapshotOptions = options(templateSnapshotOptionTexts);
        this.options = options(optionTexts);
    }

    public PollId id() { return id; }
    public String title() { return title; }
    public String createdBy() { return createdBy; }
    public Visibility visibility() { return visibility; }
    public State state() { return state; }
    public TemplateGroup templateGroup() { return templateGroup; }
    public List<Option> templateSnapshotOptions() { return templateSnapshotOptions; }
    public List<Option> options() { return options; }

    public Poll replaceOptions(List<String> optionTexts) {
        if (state != State.DRAFT) throw new IllegalStateException("Poll options can only be changed in a draft.");
        options = options(optionTexts);
        return this;
    }

    public static Poll privateDraftFrom(TemplateGroup templateGroup, String title, String createdBy, List<String> templateOptionTexts) {
        List<String> orderedTemplateOptions = templateOptionTexts.stream().sorted(java.util.Comparator.comparing(text -> text.toLowerCase(Locale.ROOT))).toList();
        return new Poll(PollId.newId(), title, createdBy, Visibility.PRIVATE, State.DRAFT, templateGroup, orderedTemplateOptions, orderedTemplateOptions);
    }

    private static List<Option> options(List<String> optionTexts) {
        if (optionTexts == null || optionTexts.isEmpty()) throw new IllegalArgumentException("A poll must have at least one option.");
        Set<String> normalizedTexts = new LinkedHashSet<>();
        List<String> texts = optionTexts.stream().map(text -> requiredText(text, "An option text must not be blank.")).toList();
        for (String text : texts) {
            if (!normalizedTexts.add(normalize(text))) throw new IllegalArgumentException("Poll option texts must be unique.");
        }
        return java.util.stream.IntStream.range(0, texts.size()).mapToObj(index -> new Option(index + 1, texts.get(index))).toList();
    }

    private static String requiredText(String text, String message) {
        if (text == null || text.trim().isEmpty()) throw new IllegalArgumentException(message);
        return text.trim();
    }

    private static String normalize(String text) { return text.trim().toLowerCase(Locale.ROOT); }

    public enum Visibility { PRIVATE }
    public enum State { DRAFT, ACTIVE, EXPIRED, ARCHIVED, DELETED }
    public record PollId(String value) {
        public PollId {
            if (value == null || value.isBlank()) throw new IllegalArgumentException("A poll ID must not be blank.");
        }

        public static PollId of(String value) { return new PollId(value); }
        public static PollId newId() { return new PollId(UUID.randomUUID().toString()); }
    }
    public record TemplateGroup(TemplateGroupId id, String name) {
        public TemplateGroup {
            if (id == null) throw new IllegalArgumentException("A poll must have a template group.");
            name = requiredText(name, "A template group name must not be blank.");
        }
    }

    public record TemplateGroupId(long value) {
        public TemplateGroupId {
            if (value <= 0) throw new IllegalArgumentException("A template group ID must be positive.");
        }

        public static TemplateGroupId of(long value) { return new TemplateGroupId(value); }
    }
    public record Option(int number, String text) { }
}

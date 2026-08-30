package de.justvotes.pollmanagement.core.model;

import de.justvotes.pollmanagement.core.event.PollPublished;
import de.justvotes.pollmanagement.core.exception.PollNotActiveException;

import java.time.Instant;
import java.util.Comparator;
import java.util.*;
import java.util.stream.IntStream;

public final class Poll {
    private final PollId id;
    private final String title;
    private final String createdBy;
    private final Instant createdAt;
    private final TemplateGroup templateGroup;
    private final List<Option> templateSnapshotOptions;
    private final List<Vote> votes;
    private Visibility visibility;
    private State state;
    private Instant endsAt;
    private List<Option> options;

    private Poll() {
        this.id = null;
        this.title = null;
        this.createdBy = null;
        this.createdAt = null;
        this.visibility = null;
        this.state = null;
        this.templateGroup = null;
        this.templateSnapshotOptions = null;
        this.options = null;
        this.votes = null;
    }

    private Poll(PollId id, String title, String createdBy, Visibility visibility, State state, Instant createdAt, Instant endsAt, TemplateGroup templateGroup, List<String> templateSnapshotOptionTexts, List<String> optionTexts, List<Vote> votes) {
        this.id = id;
        this.title = requiredText(title, "A poll title must not be blank.");
        this.createdBy = requiredText(createdBy, "A poll creator must not be blank.");
        this.createdAt = Objects.requireNonNull(createdAt, "A poll creation time must not be null.");
        this.visibility = visibility;
        this.state = state;
        this.endsAt = endsAt;
        if (templateGroup == null) {
            throw new IllegalArgumentException("A poll must have a template group.");
        }
        this.templateGroup = templateGroup;
        this.templateSnapshotOptions = options(templateSnapshotOptionTexts);
        this.options = options(optionTexts);
        this.votes = new ArrayList<>(votes);
    }

    public static Poll reconstitue(PollId id, String title, String createdBy, Visibility visibility, State state, Instant endsAt, TemplateGroup templateGroup, List<String> templateSnapshotOptionTexts, List<String> optionTexts, List<Vote> votes) {
        return new Poll(id, title, createdBy, visibility, state, Instant.EPOCH, endsAt, templateGroup, templateSnapshotOptionTexts, optionTexts, votes);
    }

    public static Poll reconstitue(PollId id, String title, String createdBy, Visibility visibility, State state, Instant createdAt, Instant endsAt, TemplateGroup templateGroup, List<String> templateSnapshotOptionTexts, List<String> optionTexts, List<Vote> votes) {
        return new Poll(id, title, createdBy, visibility, state, createdAt, endsAt, templateGroup, templateSnapshotOptionTexts, optionTexts, votes);
    }

    public static Poll reconstitue(PollId id, String title, String createdBy, Visibility visibility, State state, TemplateGroup templateGroup, List<String> templateSnapshotOptionTexts, List<String> optionTexts, List<Vote> votes) {
        return reconstitue(id, title, createdBy, visibility, state, Instant.EPOCH, null, templateGroup, templateSnapshotOptionTexts, optionTexts, votes);
    }

    public static Poll privateDraftFrom(TemplateGroup templateGroup, String title, String createdBy, List<String> templateOptionTexts) {
        List<String> orderedTemplateOptions = templateOptionTexts.stream().sorted(Comparator.comparing(text -> text.toLowerCase(Locale.ROOT))).toList();
        return new Poll(PollId.newId(), title, createdBy, Visibility.PRIVATE, State.DRAFT, Instant.now(), null, templateGroup, orderedTemplateOptions, orderedTemplateOptions, List.of());
    }

    private static List<Option> options(List<String> optionTexts) {
        if (optionTexts == null || optionTexts.isEmpty()) {
            throw new IllegalArgumentException("A poll must have at least one option.");
        }
        Set<String> normalizedTexts = new LinkedHashSet<>();
        List<String> texts = optionTexts.stream().map(text -> requiredText(text, "An option text must not be blank.")).toList();
        for (String text : texts) {
            if (!normalizedTexts.add(normalize(text))) {
                throw new IllegalArgumentException("Poll option texts must be unique.");
            }
        }
        return IntStream.range(0, texts.size()).mapToObj(index -> new Option(index + 1, texts.get(index))).toList();
    }

    private static String requiredText(String text, String message) {
        if (text == null || text.trim().isEmpty()) {
            throw new IllegalArgumentException(message);
        }
        return text.trim();
    }

    private static String normalize(String text) {
        return text.trim().toLowerCase(Locale.ROOT);
    }

    public PollId id() {
        return id;
    }

    public String title() {
        return title;
    }

    public String createdBy() {
        return createdBy;
    }

    public Instant createdAt() {
        return createdAt;
    }

    public Visibility visibility() {
        return visibility;
    }

    public State state() {
        return state;
    }

    public Instant endsAt() {
        return endsAt;
    }

    public TemplateGroup templateGroup() {
        return templateGroup;
    }

    public List<Option> templateSnapshotOptions() {
        return templateSnapshotOptions;
    }

    public List<Option> options() {
        return options;
    }

    public List<Vote> votes() {
        return List.copyOf(votes);
    }

    public VoteOutcome castOrReplace(Identity identity, int optionNumber) {
        return castOrReplace(identity, optionNumber, Instant.now());
    }

    public VoteOutcome castOrReplace(Identity identity, int optionNumber, Instant votedAt) {
        if (!isPubliclyVisible()) {
            throw new IllegalStateException("Votes can only be cast in public active polls.");
        }
        if (options.stream().noneMatch(option -> option.number() == optionNumber)) {
            throw new IllegalArgumentException("The selected option does not belong to the poll.");
        }
        Optional<Vote> current = votes.stream().filter(vote -> vote.identity().equals(identity)).findFirst();
        if (current.isPresent() && current.get().optionNumber() == optionNumber) {
            return new VoteOutcome(VoteOutcome.Status.UNCHANGED, current.get());
        }

        Vote vote = new Vote(identity, optionNumber, votedAt);
        votes.removeIf(candidate -> candidate.identity().equals(identity));
        votes.add(vote);

        return new VoteOutcome(current.isPresent() ? VoteOutcome.Status.REPLACED : VoteOutcome.Status.CREATED, vote);
    }

    public Optional<Vote> removeVoteForIdentity(Identity identity) {
        if (state != State.ACTIVE) {
            throw new PollNotActiveException(state);
        }
        Optional<Vote> current = votes.stream().filter(vote -> vote.identity().equals(identity)).findFirst();
        current.ifPresent(votes::remove);
        return current;
    }

    public Optional<Vote> removeVoteById(long voteId) {
        if (voteId <= 0) {
            throw new IllegalArgumentException("A persisted vote ID must be positive.");
        }
        Optional<Vote> current = votes.stream().filter(vote -> vote.id() == voteId).findFirst();
        current.ifPresent(votes::remove);
        return current;
    }

    public Poll replaceOptions(List<String> optionTexts) {
        if (state != State.DRAFT) {
            throw new IllegalStateException("Poll options can only be changed in a draft.");
        }
        options = options(optionTexts);
        return this;
    }

    public PollPublished publish(String actorId) {
        if (state != State.DRAFT) {
            throw new IllegalStateException("Only a draft can be published.");
        }
        visibility = Visibility.PUBLIC;
        state = State.ACTIVE;
        return new PollPublished(id, requiredText(actorId, "A publication actor must not be blank."));
    }

    public PollPublished publish(String actorId, Instant endsAt) {
        if (endsAt == null) {
            throw new IllegalArgumentException("A published poll must have an expiry.");
        }
        PollPublished event = publish(actorId);
        this.endsAt = endsAt;
        return event;
    }

    public boolean expireIfDue(Instant now) {
        if (state != State.ACTIVE || endsAt == null || now.isBefore(endsAt)) {
            return false;
        }
        state = State.EXPIRED;
        return true;
    }

    public Poll archive() {
        if (state != State.ACTIVE && state != State.EXPIRED) {
            throw new IllegalStateException("Only an active or expired poll can be archived.");
        }
        state = State.ARCHIVED;
        return this;
    }

    public Poll restoreFromArchive() {
        if (state != State.ARCHIVED) {
            throw new IllegalStateException("Only an archived poll can be restored.");
        }
        state = State.EXPIRED;
        return this;
    }

    public Poll changeExpiry(Instant newEndsAt) {
        if (state != State.EXPIRED) {
            throw new IllegalStateException("Only an expired poll expiry can be changed.");
        }
        if (newEndsAt == null) {
            throw new IllegalArgumentException("A poll expiry must not be null.");
        }
        endsAt = newEndsAt;
        return this;
    }

    public Poll reopen(Instant now) {
        if (state != State.EXPIRED) {
            throw new IllegalStateException("Only an expired poll can be reopened.");
        }
        if (endsAt == null || !endsAt.isAfter(now)) {
            throw new IllegalStateException("A poll can only be reopened with a future expiry.");
        }
        visibility = Visibility.PUBLIC;
        state = State.ACTIVE;
        return this;
    }

    public Poll softDelete() {
        if (state != State.ACTIVE && state != State.EXPIRED && state != State.ARCHIVED) {
            throw new IllegalStateException("Only an active, expired or archived poll can be deleted.");
        }
        state = State.DELETED;
        return this;
    }

    public Poll restore() {
        if (state != State.DELETED) {
            throw new IllegalStateException("Only a deleted poll can be restored.");
        }
        state = State.ARCHIVED;
        return this;
    }

    public void requireDeleted() {
        if (state != State.DELETED) {
            throw new IllegalStateException("Only a deleted poll can be permanently deleted.");
        }
    }

    public Poll makePrivate() {
        if (visibility != Visibility.PUBLIC || state != State.ACTIVE) {
            throw new IllegalStateException("Only an active public poll can be made private.");
        }
        visibility = Visibility.PRIVATE;
        return this;
    }

    public boolean isPubliclyVisible() {
        return visibility == Visibility.PUBLIC && state == State.ACTIVE;
    }

    public boolean isPubliclyReadable() {
        return visibility == Visibility.PUBLIC && (state == State.ACTIVE || state == State.EXPIRED || state == State.ARCHIVED);
    }

    public enum Visibility {PRIVATE, PUBLIC}

    public enum State {DRAFT, ACTIVE, EXPIRED, ARCHIVED, DELETED}

    public record PollId(String value) {
        public PollId {
            if (value == null || value.isBlank()) {
                throw new IllegalArgumentException("A poll ID must not be blank.");
            }
        }

        public static PollId of(String value) {
            return new PollId(value);
        }

        public static PollId newId() {
            return new PollId(UUID.randomUUID().toString());
        }
    }

    public record TemplateGroup(TemplateGroupId id, String name, String description) {
        public TemplateGroup {
            if (id == null) {
                throw new IllegalArgumentException("A poll must have a template group.");
            }
            name = requiredText(name, "A template group name must not be blank.");
            description = description == null ? "" : description.trim();
        }

        public static TemplateGroup of(TemplateGroupId id, String name, String description) {
            return new TemplateGroup(id, name, description);
        }
    }

    public record TemplateGroupId(long value) {
        public TemplateGroupId {
            if (value <= 0) {
                throw new IllegalArgumentException("A template group ID must be positive.");
            }
        }

        public static TemplateGroupId of(long value) {
            return new TemplateGroupId(value);
        }
    }

    public record Option(int number, String text) {
    }
}

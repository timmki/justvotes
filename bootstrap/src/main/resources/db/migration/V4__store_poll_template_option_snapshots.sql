CREATE TABLE "PollTemplateSnapshotOption"
(
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    "pollID" TEXT    NOT NULL REFERENCES "Poll" (id) ON DELETE CASCADE,
    text     TEXT    NOT NULL,
    number   INTEGER NOT NULL,
    UNIQUE ("pollID", number)
);

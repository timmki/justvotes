CREATE TABLE "Account"
(
    id                       INTEGER PRIMARY KEY AUTOINCREMENT,
    name                     TEXT    NOT NULL,
    "nameKey"                TEXT    NOT NULL UNIQUE,
    role                     TEXT    NOT NULL CHECK (role IN ('USER', 'ADMIN')),
    identity                 TEXT,
    "identityKey"            TEXT UNIQUE,
    email                    TEXT,
    "emailKey"               TEXT UNIQUE,
    status                   TEXT    NOT NULL CHECK (status IN ('ACTIVE', 'LOCKED')),
    "passwordHash"           TEXT    NOT NULL,
    "passwordChangeRequired" INTEGER NOT NULL DEFAULT 0,
    "sessionEpoch"           INTEGER NOT NULL DEFAULT 0,
    "createdAt"              TEXT    NOT NULL,
    "updatedAt"              TEXT    NOT NULL,
    CHECK ((role = 'USER' AND identity IS NOT NULL AND "identityKey" IS NOT NULL AND email IS NOT NULL AND "emailKey" IS NOT NULL)
        OR (role = 'ADMIN' AND identity IS NULL AND "identityKey" IS NULL AND email IS NULL AND "emailKey" IS NULL AND status = 'ACTIVE'))
);
CREATE UNIQUE INDEX "Account_single_admin_idx" ON "Account" (role) WHERE role = 'ADMIN';

CREATE TABLE "Invitation"
(
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    email               TEXT    NOT NULL,
    "emailKey"          TEXT    NOT NULL,
    "tokenHash"         TEXT    NOT NULL UNIQUE,
    status              TEXT    NOT NULL CHECK (status IN ('OPEN', 'ACCEPTED', 'REVOKED')),
    "deliveryFailed"    INTEGER NOT NULL DEFAULT 0,
    "issuedAt"          TEXT    NOT NULL,
    "expiresAt"         TEXT    NOT NULL,
    "acceptedAt"        TEXT,
    "acceptedAccountId" INTEGER REFERENCES "Account" (id)
);
CREATE UNIQUE INDEX "Invitation_open_email_idx" ON "Invitation" ("emailKey") WHERE status = 'OPEN';

DELETE FROM "Vote";
DELETE FROM "PollDomainEvent"
WHERE "eventType" IN ('VoteCast', 'VoteReplaced', 'VoteWithdrawn', 'VoteRemovedByAdmin', 'VoteRemovedForIdentityChange');

DROP TABLE "Admin";

ALTER TABLE "OptionTemplateGroup"
    ADD COLUMN kind TEXT NOT NULL DEFAULT 'MANUAL' CHECK (kind IN ('MANUAL', 'MEMBERS'));
CREATE UNIQUE INDEX "OptionTemplateGroup_members_idx" ON "OptionTemplateGroup" (kind) WHERE kind = 'MEMBERS';

ALTER TABLE "OptionTemplate"
    ADD COLUMN "memberIdentityKey" TEXT;
CREATE UNIQUE INDEX "OptionTemplate_memberIdentityKey_idx" ON "OptionTemplate" ("memberIdentityKey");

ALTER TABLE "Poll"
    ADD COLUMN "followsMembers" INTEGER NOT NULL DEFAULT 0;

UPDATE "OptionTemplateGroup"
SET name = name || ' (manuell)'
WHERE lower(trim(name)) = 'alle mitglieder';

INSERT INTO "OptionTemplateGroup" (name, description, kind)
VALUES ('Alle Mitglieder', 'Wird automatisch mit allen Mitgliedern aktualisiert.', 'MEMBERS');

UPDATE "OptionTemplate"
SET "memberIdentityKey" = (SELECT account."identityKey"
                           FROM "Account" account
                           WHERE account.role = 'USER'
                             AND (account.identity = "OptionTemplate".name
                               OR lower(account.identity) = lower(trim("OptionTemplate".name))))
WHERE id IN (SELECT min(template.id)
             FROM "OptionTemplate" template
                      JOIN "Account" account ON account.role = 'USER'
                 AND (account.identity = template.name OR lower(account.identity) = lower(trim(template.name)))
             GROUP BY account.id);

INSERT INTO "OptionTemplate" (name, "memberIdentityKey")
SELECT account.identity, account."identityKey"
FROM "Account" account
WHERE account.role = 'USER'
  AND NOT EXISTS (SELECT 1 FROM "OptionTemplate" template WHERE template."memberIdentityKey" = account."identityKey");

INSERT INTO "OptionTemplateGroupMember" ("templateID", "groupID")
SELECT template.id, (SELECT id FROM "OptionTemplateGroup" WHERE kind = 'MEMBERS')
FROM "OptionTemplate" template
WHERE template."memberIdentityKey" IS NOT NULL;

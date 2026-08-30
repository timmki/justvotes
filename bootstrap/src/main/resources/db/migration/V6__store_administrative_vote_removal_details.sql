ALTER TABLE "PollDomainEvent"
    ADD COLUMN "voteId" INTEGER;
ALTER TABLE "PollDomainEvent"
    ADD COLUMN reason TEXT;
ALTER TABLE "PollDomainEvent"
    ADD COLUMN "voteUserID" TEXT;
ALTER TABLE "PollDomainEvent"
    ADD COLUMN "voteOptionNumber" INTEGER;
ALTER TABLE "PollDomainEvent"
    ADD COLUMN "voteVotedAt" TEXT;

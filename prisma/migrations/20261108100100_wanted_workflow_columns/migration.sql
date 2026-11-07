-- Wanted notices: nature of the notice, legal basis, verification step, suspension (SIGPN-T v2.0, section 4).
-- Additive only. Rollback: DROP the new columns / type; the SUSPENDED enum value can stay unused.


CREATE TYPE "WantedKind" AS ENUM ('SEARCH_WARRANT', 'HEARING', 'MISSING_PERSON');

ALTER TABLE "WantedPerson"
  ADD COLUMN "kind" "WantedKind" NOT NULL DEFAULT 'SEARCH_WARRANT',
  ADD COLUMN "legalBasis" TEXT,
  ADD COLUMN "issuingAuthority" TEXT,
  ADD COLUMN "verifiedById" TEXT,
  ADD COLUMN "verifiedAt" TIMESTAMP(3),
  ADD COLUMN "verificationNotes" TEXT,
  ADD COLUMN "suspendedAt" TIMESTAMP(3),
  ADD COLUMN "suspensionReason" TEXT;

ALTER TABLE "WantedPerson" ADD CONSTRAINT "WantedPerson_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- A verification is never self-granted: the verifier cannot be the issuer.
ALTER TABLE "WantedPerson" ADD CONSTRAINT "WantedPerson_verifier_not_issuer" CHECK ("verifiedById" IS NULL OR "verifiedById" <> "issuedById");
-- Four eyes on approval as well (legacy rows approved by their own issuer are tolerated through NOT VALID).
ALTER TABLE "WantedPerson" ADD CONSTRAINT "WantedPerson_approver_not_issuer" CHECK ("approvedById" IS NULL OR "approvedById" <> "issuedById") NOT VALID;
-- "One live notice per person" is enforced by the service for new notices (existing data holds historical test duplicates, so no unique index).

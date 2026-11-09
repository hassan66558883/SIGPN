-- Security audit, lot 4: approval workflow for sensitive account, role and clearance changes.
-- A request carries the change; one (ordinary) or two (sensitive) authorised approvers decide; only then is it executed.
-- The votes are append-only, like the audit log.
CREATE TYPE "ApprovalKind" AS ENUM ('USER_CREATE', 'USER_ROLE_CHANGE', 'USER_CLEARANCE_RAISE', 'ROLE_PERMISSIONS_ADD');
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'EXECUTED', 'REJECTED', 'CANCELLED', 'EXPIRED', 'FAILED');
CREATE TYPE "ApprovalVote" AS ENUM ('APPROVE', 'REJECT');

CREATE TABLE "ApprovalRequest" (
  "id" TEXT NOT NULL,
  "kind" "ApprovalKind" NOT NULL,
  "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "requiredApprovals" INTEGER NOT NULL,
  "summary" TEXT NOT NULL,
  "reason" TEXT,
  "payload" JSONB NOT NULL,
  "targetUserId" TEXT,
  "targetRoleId" TEXT,
  "regionId" TEXT,
  "adminDepartmentId" TEXT,
  "stationId" TEXT,
  "requestedById" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "decidedAt" TIMESTAMP(3),
  "executedAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "resultEntityId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApprovalRequest_required_check" CHECK ("requiredApprovals" IN (1, 2)),
  CONSTRAINT "ApprovalRequest_requester_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "ApprovalRequest_status_createdAt_idx" ON "ApprovalRequest"("status", "createdAt");
CREATE INDEX "ApprovalRequest_requestedById_idx" ON "ApprovalRequest"("requestedById");

CREATE TABLE "ApprovalDecision" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "approverId" TEXT NOT NULL,
  "vote" "ApprovalVote" NOT NULL,
  "comment" TEXT,
  "approverScope" "ScopeLevel" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApprovalDecision_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApprovalDecision_request_fkey" FOREIGN KEY ("requestId") REFERENCES "ApprovalRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ApprovalDecision_approver_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ApprovalDecision_requestId_approverId_key" ON "ApprovalDecision"("requestId", "approverId");

-- Votes cannot be changed or removed once cast (a person decides once).
CREATE TRIGGER approval_decision_append_only BEFORE UPDATE OR DELETE ON "ApprovalDecision" FOR EACH ROW EXECUTE FUNCTION pms_forbid_mutation();

-- Nobody can approve their own request, at the database level too.
CREATE OR REPLACE FUNCTION pms_approval_no_self() RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "ApprovalRequest" r WHERE r."id" = NEW."requestId" AND r."requestedById" = NEW."approverId") THEN
    RAISE EXCEPTION 'The requester of an approval cannot decide it' USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER approval_decision_no_self BEFORE INSERT ON "ApprovalDecision" FOR EACH ROW EXECUTE FUNCTION pms_approval_no_self();

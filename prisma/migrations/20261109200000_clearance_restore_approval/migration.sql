-- Security audit, lot 5: after a reassignment the sensitive permissions are suspended (clearance back to standard) until a
-- supervisor of the new unit re-approves them: a one-approval request of this kind, created automatically. Additive.
ALTER TYPE "ApprovalKind" ADD VALUE IF NOT EXISTS 'USER_CLEARANCE_RESTORE';

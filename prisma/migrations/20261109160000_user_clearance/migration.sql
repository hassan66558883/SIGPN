-- Security audit, lot 3: security clearance of users (provisional tiers: standard, sensitive, confidential).
-- A sensitive permission is only usable by a user cleared for it; existing users keep exactly what they had:
-- the clearance is backfilled from the permissions their role already holds, so nothing changes on the day of the migration.
CREATE TYPE "ClearanceLevel" AS ENUM ('STANDARD', 'SENSITIVE', 'CONFIDENTIAL');

ALTER TABLE "User" ADD COLUMN "clearance" "ClearanceLevel" NOT NULL DEFAULT 'STANDARD';

-- Sensitive permissions (audit decision 7). Keep in step with SENSITIVE_PERMISSIONS in src/server/rbac/sensitivity.ts.
UPDATE "User" u SET "clearance" = 'SENSITIVE'
WHERE EXISTS (
  SELECT 1 FROM "RolePermission" rp JOIN "Permission" p ON p.id = rp."permissionId"
  WHERE rp."roleId" = u."roleId" AND p.code IN (
    'warrants:approve', 'wanted:approve', 'wanted:publish', 'detention:extend', 'roles:manage', 'cases:view_sensitive',
    'documents:view_confidential', 'hr:discipline_view', 'hr:discipline_manage', 'hr:discipline_decide', 'hr:pay_view',
    'hr:pay_manage', 'hr:pay_validate', 'hr:pay_export', 'reports:export', 'audit:export', 'wanted:export', 'traffic:export', 'system:backup'
  )
);

UPDATE "User" u SET "clearance" = 'CONFIDENTIAL'
WHERE EXISTS (
  SELECT 1 FROM "RolePermission" rp JOIN "Permission" p ON p.id = rp."permissionId"
  WHERE rp."roleId" = u."roleId" AND p.code = 'documents:view_confidential'
);

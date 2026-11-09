-- Security audit, lot 7: sessions and API keys.
--
-- Sessions: an account is "sensitive" when its role holds a sensitive permission or its clearance is above standard. Such a
-- session carries a shorter idle timeout and is the account's only active session. The flag is set when the session is created
-- (a change of role or clearance already ends the sessions), and backfilled here for the sessions that are open today.
ALTER TABLE "Session" ADD COLUMN "sensitive" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Session" s SET "sensitive" = true
FROM "User" u
WHERE u."id" = s."userId" AND s."revokedAt" IS NULL AND (
  u."clearance" <> 'STANDARD' OR EXISTS (
    SELECT 1 FROM "RolePermission" rp JOIN "Permission" p ON p."id" = rp."permissionId"
    WHERE rp."roleId" = u."roleId" AND p."code" IN (
      'warrants:approve', 'wanted:approve', 'wanted:publish', 'detention:extend', 'roles:manage', 'approvals:decide', 'cases:view_sensitive',
      'documents:view_confidential', 'hr:discipline_view', 'hr:discipline_manage', 'hr:discipline_decide', 'hr:pay_view',
      'hr:pay_manage', 'hr:pay_validate', 'hr:pay_export', 'reports:export', 'audit:export', 'wanted:export', 'traffic:export', 'system:backup'
    )
  )
);

-- API keys: a key created by the application never carries a sensitive permission ("noSensitive") and always expires, at most
-- 90 days after its creation (rotation). Keys that already exist are brought under the same rules. A key inserted directly in the
-- database without the flag keeps the legacy behaviour (the automated tests do this); the application never creates one.
ALTER TABLE "ApiKey" ADD COLUMN "noSensitive" BOOLEAN NOT NULL DEFAULT false;
UPDATE "ApiKey" SET "noSensitive" = true;
UPDATE "ApiKey" SET "expiresAt" = "createdAt" + interval '90 days' WHERE "expiresAt" IS NULL;

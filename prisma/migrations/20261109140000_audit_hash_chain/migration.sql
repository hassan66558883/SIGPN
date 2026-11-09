-- Security audit, lot 6: the audit log becomes tamper-evident.
-- Every row carries its position in the chain (chainSeq), the hash of the previous row (prevHash) and its own hash
-- (hash = SHA-256 over the previous hash and the content of the row). A row that is altered, removed from the middle or
-- inserted behind the head breaks the chain, and pms_audit_verify() reports where. The log stays append-only (existing
-- triggers) and nothing is ever deleted.
--
-- Limits, stated in the documentation: the history that already existed is chained from this migration on, so it proves
-- nothing about changes made before it; and deleting the LAST rows cannot be seen from inside the database, so the head
-- (position and hash) must be recorded outside it from time to time (pms_audit_verify() returns it).

ALTER TABLE "AuditLog" ADD COLUMN "chainSeq" integer, ADD COLUMN "prevHash" text, ADD COLUMN "hash" text;

-- One definition of the hash, used by the insert trigger, the verification and the backfill below.
CREATE OR REPLACE FUNCTION pms_audit_hash(prev text, r "AuditLog") RETURNS text AS $$
  SELECT encode(sha256(convert_to(concat_ws(chr(31),
    coalesce(prev, ''), r."chainSeq"::text, r."id", to_char(r."at", 'YYYY-MM-DD"T"HH24:MI:SS.US'),
    coalesce(r."actorId", ''), r."actorLabel", r."action", r."module", coalesce(r."entityType", ''), coalesce(r."entityId", ''),
    coalesce(r."entityLabel", ''), r."summary", coalesce(r."before"::text, ''), coalesce(r."after"::text, ''),
    r."outcome"::text, coalesce(r."ipAddress", ''), coalesce(r."userAgent", ''), coalesce(r."sessionId", '')
  ), 'UTF8')), 'hex');
$$ LANGUAGE sql STABLE;

-- Backfill: chain the existing rows in (at, id) order. The append-only trigger is lifted for this one statement block only.
DO $$
DECLARE
  rec record;
  prev text := NULL;
  seq integer := 0;
  h text;
BEGIN
  ALTER TABLE "AuditLog" DISABLE TRIGGER audit_log_append_only;
  FOR rec IN SELECT "id" FROM "AuditLog" ORDER BY "at", "id" LOOP
    seq := seq + 1;
    UPDATE "AuditLog" SET "chainSeq" = seq, "prevHash" = prev WHERE "id" = rec."id";
    UPDATE "AuditLog" a SET "hash" = pms_audit_hash(a."prevHash", a) WHERE a."id" = rec."id" RETURNING a."hash" INTO h;
    prev := h;
  END LOOP;
  ALTER TABLE "AuditLog" ENABLE TRIGGER audit_log_append_only;
END $$;

CREATE UNIQUE INDEX "AuditLog_chainSeq_key" ON "AuditLog"("chainSeq");

-- Every insert, whatever the code path (application, seed, raw SQL), takes the next position. The advisory lock
-- serialises writers for the duration of their transaction so two rows can never claim the same position.
CREATE OR REPLACE FUNCTION pms_audit_chain() RETURNS trigger AS $$
DECLARE
  last_seq integer;
  last_hash text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('pms_audit_chain'));
  SELECT "chainSeq", "hash" INTO last_seq, last_hash FROM "AuditLog" WHERE "chainSeq" IS NOT NULL ORDER BY "chainSeq" DESC LIMIT 1;
  NEW."chainSeq" := coalesce(last_seq, 0) + 1;
  NEW."prevHash" := last_hash;
  NEW."hash" := pms_audit_hash(last_hash, NEW);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_chain BEFORE INSERT ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION pms_audit_chain();

-- Verification: walks the whole chain and reports the first break (NULL = intact) with the head to record elsewhere.
CREATE OR REPLACE FUNCTION pms_audit_verify()
RETURNS TABLE (checked integer, head_seq integer, head_hash text, broken_seq integer, reason text) AS $$
DECLARE
  rec record;
  prev text := NULL;
  expected integer := 0;
  n integer := 0;
BEGIN
  FOR rec IN SELECT a.*, pms_audit_hash(a."prevHash", a) AS recomputed FROM "AuditLog" a ORDER BY a."chainSeq" NULLS LAST, a."at" LOOP
    expected := expected + 1;
    n := n + 1;
    IF rec."chainSeq" IS NULL THEN
      RETURN QUERY SELECT n, expected - 1, prev, expected, 'a row has no position in the chain'::text;
      RETURN;
    ELSIF rec."chainSeq" <> expected THEN
      RETURN QUERY SELECT n, expected - 1, prev, expected, 'row(s) missing: position ' || expected || ' expected, ' || rec."chainSeq" || ' found';
      RETURN;
    ELSIF rec."prevHash" IS DISTINCT FROM prev THEN
      RETURN QUERY SELECT n, expected - 1, prev, rec."chainSeq", 'the link to the previous row does not match'::text;
      RETURN;
    ELSIF rec."hash" IS DISTINCT FROM rec.recomputed THEN
      RETURN QUERY SELECT n, expected - 1, prev, rec."chainSeq", 'the content of the row was altered'::text;
      RETURN;
    END IF;
    prev := rec."hash";
  END LOOP;
  RETURN QUERY SELECT n, expected, prev, NULL::integer, NULL::text;
END;
$$ LANGUAGE plpgsql STABLE;

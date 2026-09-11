-- Append-only protection for tamper-evident tables.
-- AuditLog and CustodyEvent may only be INSERTed; UPDATE and DELETE are rejected at the database level.
CREATE OR REPLACE FUNCTION pms_forbid_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Table % is append-only: % is not allowed', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_append_only
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION pms_forbid_mutation();

CREATE TRIGGER custody_event_append_only
  BEFORE UPDATE OR DELETE ON "CustodyEvent"
  FOR EACH ROW EXECUTE FUNCTION pms_forbid_mutation();

-- Case-insensitive search helpers for persons (name, phone) and users.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS person_lastname_trgm ON "Person" USING gin (lower("lastName") gin_trgm_ops);
CREATE INDEX IF NOT EXISTS person_firstname_trgm ON "Person" USING gin (lower("firstName") gin_trgm_ops);
CREATE INDEX IF NOT EXISTS case_title_trgm ON "Case" USING gin (lower("title") gin_trgm_ops);

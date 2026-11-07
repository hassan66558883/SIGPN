-- Wanted notices: SUSPENDED status. Separate migration: a new enum value cannot be used in the transaction that adds it.
ALTER TYPE "WantedStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';

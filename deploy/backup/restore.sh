#!/bin/sh
# Restore a pg_dump custom-format backup into the target database.
# Usage: PGHOST=db PGUSER=pms_app PGPASSWORD=... PGDATABASE=pms sh restore.sh /backups/pms-2026....dump
# The target database is dropped and re-created: STOP THE APP FIRST.
set -eu
FILE="${1:?backup file required}"
[ -f "$FILE" ] || { echo "no such file: $FILE"; exit 1; }
if [ -f "$FILE.sha256" ]; then
  echo "[restore] verifying checksum"
  (cd "$(dirname "$FILE")" && sha256sum -c "$(basename "$FILE").sha256")
fi
echo "[restore] restoring $FILE into $PGDATABASE"
pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$PGDATABASE" "$FILE"
echo "[restore] done"

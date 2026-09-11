#!/bin/sh
# Daily logical backup (pg_dump custom format) with SHA-256 manifest and retention.
# Runs inside the `backup` container (see docker-compose.yml) or on any host with pg_dump.
set -eu
DIR="${BACKUP_DIR:-/backups}"
RETENTION="${BACKUP_RETENTION_DAYS:-30}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$DIR/pms-$STAMP.dump"
mkdir -p "$DIR"
echo "[backup] $STAMP starting pg_dump -> $FILE"
pg_dump --format=custom --compress=6 --no-owner --file="$FILE"
sha256sum "$FILE" > "$FILE.sha256"
SIZE="$(stat -c %s "$FILE" 2>/dev/null || stat -f %z "$FILE")"
echo "[backup] done: $SIZE bytes, $(cat "$FILE.sha256")"
# Retention
find "$DIR" -name 'pms-*.dump' -mtime +"$RETENTION" -print -delete
find "$DIR" -name 'pms-*.dump.sha256' -mtime +"$RETENTION" -delete

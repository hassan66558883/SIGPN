#!/bin/sh
set -e
# Apply pending migrations, then start the standalone Next.js server.
echo "[entrypoint] applying database migrations"
./node_modules/.bin/prisma migrate deploy
echo "[entrypoint] starting PMS on port ${PORT:-3300}"
exec node server.js

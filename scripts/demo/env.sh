#!/bin/sh
# Source this file: points DATABASE_URL at the demo database (name must end in _demo) and APP_URL at :3302.
# Usage:  . scripts/demo/env.sh
DEV_URL=$(grep '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | tr -d '"')
BASE_URL=${DEV_URL%%\?*}
BASE_URL=${BASE_URL%/*}
export DATABASE_URL="${BASE_URL}/pms_demo?schema=public"
export DEMO_DATABASE_URL="$DATABASE_URL"
export APP_URL="http://localhost:3302"
export PMS_URL="http://localhost:3302"
export NEXT_DIST_DIR=.next-demo

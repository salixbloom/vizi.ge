#!/bin/sh
set -e

# Ensure storage dirs exist on the mounted volume (env-driven paths).
mkdir -p "$(dirname "${DATABASE_PATH:-/app/data/vizi.db}")" "${UPLOAD_DIR:-/app/data/uploads}"

echo "Applying database migrations to ${DATABASE_PATH:-/app/data/vizi.db} ..."
npm run db:migrate

exec "$@"

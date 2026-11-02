#!/bin/sh
set -e

echo "Checking database connection and applying migrations..."
if [ -f "./node_modules/prisma/build/index.js" ]; then
  node ./node_modules/prisma/build/index.js migrate deploy || echo "Warning: Migration failed or skipped. Continuing startup..."
fi

echo "Starting DM Remission application on port 3000..."
exec node server.js


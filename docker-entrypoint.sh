#!/bin/sh
set -e

echo "Checking database connection and applying migrations..."
prisma migrate deploy || echo "Warning: Migration failed or skipped. Continuing startup..."

echo "Starting DM Remission application on port 3000..."
exec node server.js

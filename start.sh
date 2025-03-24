#!/bin/sh
# start.sh - Container startup script

# Wait for database to be ready if using external database
if [ "$DB_CLIENT" = "pg" ]; then
  echo "Waiting for PostgreSQL to be ready..."
  # Simple wait-for script
  /app/server/scripts/wait-for-postgres.sh
fi

# Apply database migrations
echo "Applying database migrations..."
node /app/server/database/migrate.js

# Start the application
echo "Starting Pocket ID Dashboard..."
exec node /app/server/index.js
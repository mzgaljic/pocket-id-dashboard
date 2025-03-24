#!/bin/sh

set -e

host="${DB_HOST:-localhost}"
port="${DB_PORT:-5432}"
user="${DB_USER:-postgres}"
database="${DB_NAME:-pocket_id_dashboard}"

echo "Waiting for PostgreSQL at $host:$port..."

# Wait for PostgreSQL to be ready
until PGPASSWORD=$DB_PASSWORD psql -h "$host" -p "$port" -U "$user" -d "$database" -c '\q'; do
  echo "PostgreSQL is unavailable - sleeping for 1 second"
  sleep 1
done

echo "PostgreSQL is up - continuing"
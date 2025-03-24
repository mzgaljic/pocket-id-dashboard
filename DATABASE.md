# Database Configuration

## Overview

Pocket ID Dashboard uses a database to store:
- Access requests
- User sessions

By default, it uses SQLite, but PostgreSQL is also supported.

## Configuration

Configure the database through environment variables:

```
# SQLite (default)
DB_CLIENT=better-sqlite3
DB_FILENAME=./data/pocket-id-dashboard.db

# PostgreSQL
DB_CLIENT=pg
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=pocket_id_dashboard
DB_SSL=false
```

## Docker Persistence

When using Docker, database files are stored in a named volume:

```yaml
volumes:
  - pocket_id_data:/app/data
```

## Schema

### access_requests

Stores user requests for access to applications.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| user_id | TEXT | ID of the requesting user |
| app_id | TEXT | ID of the requested application |
| requested_at | TIMESTAMP | When the request was made |
| status | TEXT | Status (pending/approved/rejected) |
| notes | TEXT | Additional information |

### sessions

Stores user session data.

| Column | Type | Description |
|--------|------|-------------|
| sid | TEXT | Session ID |
| sess | JSON | Session data |
| expired | TIMESTAMP | Expiration time |

## Backup and Restore

### SQLite

Backup:
```bash
docker exec -it pocket-id-dashboard cp /app/data/pocket-id-dashboard.db /app/data/backup.db
docker cp pocket-id-dashboard:/app/data/backup.db ./backup.db
```

Restore:
```bash
docker cp ./backup.db pocket-id-dashboard:/app/data/pocket-id-dashboard.db
docker restart pocket-id-dashboard
```

### PostgreSQL

Use standard PostgreSQL backup and restore procedures.
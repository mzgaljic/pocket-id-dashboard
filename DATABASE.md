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

When using Docker, database files (sqlite) are stored inside the container in `/app/data`. If you
wish to persist this, map that directory to a directory on your host machine. 

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


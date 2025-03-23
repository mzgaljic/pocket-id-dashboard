# Database Documentation

## Overview

This application uses a database to persist access requests. By default, it uses SQLite, but the architecture is designed to support other database backends in the future.

## Configuration

The database is configured through environment variables:
```
DB_CLIENT=better-sqlite3 # Database client (currently only better-sqlite3 is supported)
DB_FILENAME=./data/pocket-id-dashboard.db # Path to the SQLite database file
```


## Schema

### Table: access_requests

Stores user requests for access to applications.

#### Columns

| Column Name   | Type      | Description                                           | Constraints    |
|---------------|-----------|-------------------------------------------------------|----------------|
| id            | INTEGER   | Primary key                                           | PK, AUTOINCREMENT |
| user_id       | TEXT      | ID of the user making the request                     | NOT NULL       |
| app_id        | TEXT      | ID of the application being requested                 | NOT NULL       |
| requested_at  | TIMESTAMP | When the request was made                             | DEFAULT now()  |
| status        | TEXT      | Status of the request ('pending', 'approved', 'rejected') | DEFAULT 'pending' |
| notes         | TEXT      | Additional information about the request              |                |

#### Indexes

- Composite index on `(user_id, app_id)` for faster lookups
- Unique constraint on `(user_id, app_id)` to prevent duplicate requests

## Data Flow

1. When a user requests access to an application, a record is created in the `access_requests` table
2. The record is initially created with status 'pending'
3. When the application loads, it fetches all access requests for the current user
4. The UI displays the status of each request

## Session Storage
The application uses the database to store session data, allowing for session persistence across server restarts.

### Table: sessions
Stores user session data.

#### Columns
| Column Name | Type      | Description                                   | Constraints |
|-------------|-----------|-----------------------------------------------|-------------|
| sid         | TEXT      | Session ID                                    | PK          |
| sess        | JSON      | Session data (serialized)                     | NOT NULL    |
| expired     | TIMESTAMP | When the session expires                      | NOT NULL    |

#### Indexes
- Primary key on `sid`
- Index on `expired` for efficient cleanup of expired sessions

## PostgreSQL Support
To use PostgreSQL instead of SQLite, set the following environment variables:
```
DB_CLIENT=pg
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=pocket_id_dashboard
DB_SSL=false
```

## SQLite Optimizations

The SQLite database is configured with the following optimizations for reliability:

1. **WAL Journal Mode**: Write-Ahead Logging provides better concurrency and crash recovery
2. **Normal Synchronous Mode**: Balances durability and performance
3. **Busy Timeout**: Set to 5000ms to handle concurrent access and avoid "database is locked" errors

## Database Files

When using SQLite, the following files are created:

- `data/pocket-id-dashboard.db`: The main database file
- `data/pocket-id-dashboard.db-shm`: Shared memory file used by WAL mode
- `data/pocket-id-dashboard.db-wal`: Write-ahead log file

These files should be backed up together to ensure data integrity.

## Future Extensibility

The database layer is designed to be extensible. To add support for a new database backend:

1. Update the database configuration in `server/config/database.js`
2. Add the appropriate client library (e.g., `pg` for PostgreSQL)
3. Update the migrations if needed for the specific database dialect

The repository pattern abstracts the database operations, so minimal changes would be needed in the application code.
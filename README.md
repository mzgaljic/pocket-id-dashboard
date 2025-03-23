## Database

This application uses a database to persist access requests. By default, it uses SQLite, but the architecture is designed to support other database backends in the future.

For detailed information about the database schema and configuration, see [DATABASE.md](DATABASE.md).

```
+-------------------+
| access_requests   |
+-------------------+
| id (PK)           |
| user_id           |
| app_id            |
| requested_at      |
| status            |
| notes             |
+-------------------+ 
```

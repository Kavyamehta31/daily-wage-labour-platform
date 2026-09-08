# Database Setup & Initialization

## Local Migration Execution

You can run the initial schema migration in two ways:

### Option 1: Via standard Node.js script (Using configured `.env` credentials)
```bash
npm run db:init --prefix backend
```

### Option 2: Via PostgreSQL Command Line (`psql`)
```bash
psql -h localhost -U postgres -d postgres -f backend/database/schema.sql
```

## Schema Entities Summary

- **`users`**: Contractor & Admin accounts with role validation.
- **`sites`**: Work sites belonging to a contractor.
- **`workers`**: Worker records with non-negative `daily_wage`.
- **`worker_site_assignments`**: Maps workers to assigned sites with unique constraint.
- **`attendance`**: Daily attendance records (`PRESENT`, `ABSENT`, `HALF_DAY`). Prevents duplicate records for the same `(worker_id, site_id, date)`.
- **`payments`**: Disbursed payments tracking `worker_id`, non-negative `amount`, and `payment_date`.

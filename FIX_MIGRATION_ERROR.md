# Fix Migration Error: Column "departure_date" Does Not Exist

## Problem
The migration fails because the `trips` table already exists with a different schema than expected.

## Solution

### Step 1: Start Docker Desktop
1. Open **Docker Desktop** application
2. Wait until it's fully running (whale icon steady in system tray)

### Step 2: Reset Supabase Database
Run these commands in order:

```bash
# Stop Supabase
npm run supabase:stop

# Start Supabase fresh
npm run supabase:start

# Reset database (applies all migrations from scratch)
npm run supabase:db:reset
```

### Step 3: Verify
```bash
# Start your dev server
npm run dev
```

## Alternative: Manual Database Reset

If the above doesn't work, try:

```bash
# Stop and remove all containers
npm run supabase:stop

# Remove Supabase volumes (this deletes all data)
docker volume rm supabase_db_wasel

# Start fresh
npm run supabase:start
npm run supabase:db:reset
```

## Why This Happens
You have multiple migration files that create/modify the `trips` table:
- `20260210_complete_schema.sql` - Creates trips with `departure_date`
- Later migrations may have altered the schema

The database reset ensures all migrations run in order from a clean state.

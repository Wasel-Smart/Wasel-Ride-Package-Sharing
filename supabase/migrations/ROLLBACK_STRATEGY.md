# Database Migration Rollback Strategy

## Overview

This document outlines the rollback strategy for all Wasel database migrations.

## Rollback Principles

1. **Every migration must have a rollback script**
2. **Rollbacks must be tested before deployment**
3. **Data migrations must preserve data**
4. **Rollbacks must be idempotent**

## Migration Dependency Graph

```
20260210_complete_schema.sql
  └─> 20260223000000_production_schema.sql
      └─> 20260224_additional_tables.sql
      └─> 20260224_postgis_functions.sql
      └─> 20260224_wasel_complete_schema.sql
          └─> 20260224000000_production_backend_schema.sql
              └─> 20260224000001_backup_configuration.sql
                  └─> 20260302_regionalization_schema.sql
                      └─> 20260310_security_performance_fixes.sql
                          └─> 20260320000000_w_mobility_platform_complete.sql
                              └─> 20260320000001_wasel_enhancements.sql
                                  └─> 20260326080000_legacy_public_table_cutover.sql
                                      └─> 20260327090000_production_operating_model.sql
                                          └─> 20260327110000_notifications_runtime_contract.sql
                                              └─> 20260401093000_database_hardening.sql
                                                  └─> 20260401113000_unified_backend_contract.sql
                                                      └─> 20260401133000_align_canonical_rls_policies.sql
                                                          └─> 20260401143000_harden_rpc_execute_permissions.sql
                                                              └─> 20260401183000_growth_and_demand_alerts.sql
                                                                  └─> 20260401193000_referrals_and_growth_events.sql
                                                                      └─> 20260401213000_expand_runtime_contract_tables.sql
                                                                          └─> 20260401223000_communications_runtime_contract.sql
                                                                              └─> 20260401233000_communication_delivery_operations.sql
                                                                                  └─> 20260402000000_database_hardening_complete.sql
                                                                                      └─> 20260402010000_gdpr_compliance_schema.sql
                                                                                          └─> 20260511060011_new-migration.sql
                                                                                              └─> 20260512000000_database_excellence_upgrade.sql
```

## Rollback Scripts Location

All rollback scripts are stored in: `supabase/migrations/rollback/`

## Rollback Naming Convention

For each migration file:
- Migration: `YYYYMMDD_description.sql`
- Rollback: `rollback/YYYYMMDD_description_rollback.sql`

## Rollback Execution Order

Rollbacks must be executed in **reverse order** of migrations.

## Critical Migrations Requiring Special Attention

### 1. GDPR Compliance Schema (20260402010000)
- **Risk:** High - Contains user data
- **Rollback Strategy:** Archive data before dropping tables
- **Data Preservation:** Export to backup schema

### 2. Database Hardening Complete (20260402000000)
- **Risk:** High - Security policies
- **Rollback Strategy:** Restore previous RLS policies
- **Testing Required:** Verify access patterns

### 3. Communication Delivery Operations (20260401233000)
- **Risk:** Medium - Active notifications
- **Rollback Strategy:** Drain queue before rollback
- **Testing Required:** Verify notification delivery

### 4. Legacy Public Table Cutover (20260326080000)
- **Risk:** Critical - Data migration
- **Rollback Strategy:** Restore from backup
- **Testing Required:** Full data integrity check

## Rollback Testing Checklist

Before deploying any migration:

- [ ] Rollback script created
- [ ] Rollback tested on development
- [ ] Rollback tested on staging
- [ ] Data integrity verified after rollback
- [ ] Performance impact measured
- [ ] Rollback documented
- [ ] Team trained on rollback procedure

## Emergency Rollback Procedure

### Step 1: Assess Impact
```bash
# Check current migration version
supabase migration list --local

# Check affected tables
psql -c "\dt"
```

### Step 2: Backup Current State
```bash
# Create backup
pg_dump -Fc wasel > backup_$(date +%Y%m%d_%H%M%S).dump

# Verify backup
pg_restore --list backup_*.dump
```

### Step 3: Execute Rollback
```bash
# Run rollback script
psql -f supabase/migrations/rollback/YYYYMMDD_description_rollback.sql

# Verify rollback
psql -c "SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;"
```

### Step 4: Verify Data Integrity
```bash
# Run integrity checks
npm run db:verify

# Check critical tables
psql -c "SELECT COUNT(*) FROM users;"
psql -c "SELECT COUNT(*) FROM rides;"
psql -c "SELECT COUNT(*) FROM packages;"
```

### Step 5: Restore Application
```bash
# Restart application
npm run restart

# Verify health
curl http://localhost:5173/health
```

## Rollback Time Estimates

| Migration Type | Estimated Rollback Time |
|---------------|------------------------|
| Schema only | 1-2 minutes |
| Small data migration | 5-10 minutes |
| Large data migration | 30-60 minutes |
| Critical system migration | 1-2 hours |

## RTO/RPO Targets

- **Recovery Time Objective (RTO):** 4 hours
- **Recovery Point Objective (RPO):** 1 hour

## Rollback Communication Plan

### Internal Communication
1. Notify engineering team via Slack
2. Update status page
3. Document incident in runbook

### External Communication
1. Update status page (if user-facing)
2. Send email to affected users (if necessary)
3. Post social media update (if major incident)

## Post-Rollback Actions

1. **Root Cause Analysis**
   - Document what went wrong
   - Identify prevention measures
   - Update migration process

2. **Data Verification**
   - Run full data integrity checks
   - Verify user accounts
   - Check transaction history

3. **Performance Monitoring**
   - Monitor database performance
   - Check query execution times
   - Verify index usage

4. **Documentation Update**
   - Update migration documentation
   - Document lessons learned
   - Update rollback procedures

## Automated Rollback Scripts

### Generate Rollback Script
```bash
#!/bin/bash
# scripts/generate-rollback.sh

MIGRATION_FILE=$1
ROLLBACK_DIR="supabase/migrations/rollback"

if [ -z "$MIGRATION_FILE" ]; then
  echo "Usage: ./generate-rollback.sh <migration_file>"
  exit 1
fi

MIGRATION_NAME=$(basename "$MIGRATION_FILE" .sql)
ROLLBACK_FILE="$ROLLBACK_DIR/${MIGRATION_NAME}_rollback.sql"

echo "-- Rollback for $MIGRATION_NAME" > "$ROLLBACK_FILE"
echo "-- Generated: $(date)" >> "$ROLLBACK_FILE"
echo "" >> "$ROLLBACK_FILE"
echo "BEGIN;" >> "$ROLLBACK_FILE"
echo "" >> "$ROLLBACK_FILE"
echo "-- Add rollback statements here" >> "$ROLLBACK_FILE"
echo "" >> "$ROLLBACK_FILE"
echo "COMMIT;" >> "$ROLLBACK_FILE"

echo "Rollback script created: $ROLLBACK_FILE"
```

### Test Rollback
```bash
#!/bin/bash
# scripts/test-rollback.sh

MIGRATION_FILE=$1

# Apply migration
supabase migration up "$MIGRATION_FILE"

# Run tests
npm run test:db

# Rollback
supabase migration down "$MIGRATION_FILE"

# Verify rollback
npm run test:db

echo "Rollback test complete"
```

## Migration Consolidation Plan

To reduce complexity, consolidate migrations:

1. **Phase 1:** Consolidate schema migrations (Weeks 1-2)
2. **Phase 2:** Consolidate data migrations (Weeks 3-4)
3. **Phase 3:** Test consolidated migrations (Week 5)
4. **Phase 4:** Deploy to production (Week 6)

## Contact Information

**Database Team Lead:** [Name]  
**On-Call Engineer:** [Phone]  
**Escalation:** [Manager]

## References

- [Supabase Migration Docs](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [PostgreSQL Backup & Restore](https://www.postgresql.org/docs/current/backup.html)
- [Database Rollback Best Practices](https://www.postgresql.org/docs/current/backup-dump.html)

---

**Last Updated:** 2025  
**Version:** 1.0  
**Status:** Active

/**
 * Database Migration Management & Verification
 * Production-grade migration safety with rollback capabilities
 */

export interface Migration {
  version: string;
  name: string;
  up: string;
  down: string;
  checksum: string;
  appliedAt?: string;
}

export interface MigrationStatus {
  version: string;
  name: string;
  status: 'pending' | 'applied' | 'failed';
  appliedAt?: string;
  error?: string;
}

export class MigrationManager {
  private supabaseUrl: string;
  private serviceRoleKey: string;

  constructor(supabaseUrl: string, serviceRoleKey: string) {
    this.supabaseUrl = supabaseUrl;
    this.serviceRoleKey = serviceRoleKey;
  }

  async verifyMigrations(): Promise<MigrationStatus[]> {
    const response = await fetch(`${this.supabaseUrl}/rest/v1/rpc/get_migration_status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: this.serviceRoleKey,
        Authorization: `Bearer ${this.serviceRoleKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to verify migrations: ${response.statusText}`);
    }

    return response.json();
  }

  async applyMigration(migration: Migration): Promise<void> {
    const response = await fetch(`${this.supabaseUrl}/rest/v1/rpc/apply_migration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: this.serviceRoleKey,
        Authorization: `Bearer ${this.serviceRoleKey}`,
      },
      body: JSON.stringify({
        version: migration.version,
        name: migration.name,
        sql: migration.up,
        checksum: migration.checksum,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to apply migration ${migration.version}: ${response.statusText}`);
    }
  }

  async rollbackMigration(version: string): Promise<void> {
    const response = await fetch(`${this.supabaseUrl}/rest/v1/rpc/rollback_migration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: this.serviceRoleKey,
        Authorization: `Bearer ${this.serviceRoleKey}`,
      },
      body: JSON.stringify({ version }),
    });

    if (!response.ok) {
      throw new Error(`Failed to rollback migration ${version}: ${response.statusText}`);
    }
  }

  async verifyRLSPolicies(): Promise<
    {
      table: string;
      policy: string;
      enabled: boolean;
    }[]
  > {
    const response = await fetch(`${this.supabaseUrl}/rest/v1/rpc/verify_rls_policies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: this.serviceRoleKey,
        Authorization: `Bearer ${this.serviceRoleKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to verify RLS policies: ${response.statusText}`);
    }

    return response.json();
  }

  async createBackup(label: string): Promise<{ backupId: string; timestamp: string }> {
    const response = await fetch(`${this.supabaseUrl}/rest/v1/rpc/create_backup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: this.serviceRoleKey,
        Authorization: `Bearer ${this.serviceRoleKey}`,
      },
      body: JSON.stringify({ label }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create backup: ${response.statusText}`);
    }

    return response.json();
  }

  async restoreBackup(backupId: string): Promise<void> {
    const response = await fetch(`${this.supabaseUrl}/rest/v1/rpc/restore_backup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: this.serviceRoleKey,
        Authorization: `Bearer ${this.serviceRoleKey}`,
      },
      body: JSON.stringify({ backup_id: backupId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to restore backup: ${response.statusText}`);
    }
  }
}

export async function verifyDatabaseHealth(
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<{
  healthy: boolean;
  checks: {
    name: string;
    status: 'pass' | 'fail';
    message?: string;
  }[];
}> {
  const checks: { name: string; status: 'pass' | 'fail'; message?: string }[] = [];

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });
    checks.push({
      name: 'Database Connectivity',
      status: response.ok ? 'pass' : 'fail',
      message: response.ok ? 'Connected' : `HTTP ${response.status}`,
    });
  } catch (error) {
    checks.push({
      name: 'Database Connectivity',
      status: 'fail',
      message: error instanceof Error ? error.message : 'Connection failed',
    });
  }

  try {
    const manager = new MigrationManager(supabaseUrl, serviceRoleKey);
    const policies = await manager.verifyRLSPolicies();
    const criticalTables = ['profiles', 'rides', 'packages', 'payments', 'wallet_transactions'];
    const missingRLS = criticalTables.filter(
      table => !policies.some(p => p.table === table && p.enabled),
    );

    checks.push({
      name: 'RLS Policies',
      status: missingRLS.length === 0 ? 'pass' : 'fail',
      message:
        missingRLS.length === 0
          ? 'All critical tables protected'
          : `Missing RLS: ${missingRLS.join(', ')}`,
    });
  } catch (error) {
    checks.push({
      name: 'RLS Policies',
      status: 'fail',
      message: error instanceof Error ? error.message : 'Verification failed',
    });
  }

  const healthy = checks.every(check => check.status === 'pass');
  return { healthy, checks };
}

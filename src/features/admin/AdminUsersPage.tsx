import { useCallback, useState } from 'react';
import { RefreshCw, Users as UsersIcon } from 'lucide-react';
import { PageShell } from '../../components/wasel-ui/WaselPagePrimitives';
import { WaselEmptyState } from '../../components/wasel-ui';
import { getUsers, setUserStatus } from '../../services/adminApi';
import { tx } from '../../locales/tx';
import { R, SPACE, TYPE, card  } from '../../utils/wasel-ds';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { userHasPermission } from '../../platform/rbac';
import {
  AdminAccessDenied,
  AdminActionButton,
  AdminNotice,
  AdminPager,
  StatusPill,
  tableStyles,
  useAdminResource,
} from './adminListShared';

const PAGE_LIMIT = 20;

interface AdminUserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  role: string | null;
  profile_status: string | null;
  created_at: string | null;
}

/**
 * The admin list endpoints return untyped rows, so normalise defensively —
 * a missing/renamed column must not blank the whole table.
 */
function toUserRow(raw: unknown): AdminUserRow | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const id = typeof row.id === 'string' ? row.id : typeof row.user_id === 'string' ? row.user_id : null;
  if (!id) {
    return null;
  }
  return {
    id,
    full_name: typeof row.full_name === 'string' ? row.full_name : null,
    email: typeof row.email === 'string' ? row.email : null,
    phone_number: typeof row.phone_number === 'string' ? row.phone_number : null,
    role: typeof row.role === 'string' ? row.role : null,
    profile_status: typeof row.profile_status === 'string' ? row.profile_status : null,
    created_at: typeof row.created_at === 'string' ? row.created_at : null,
  };
}

function isActive(status: string | null): boolean {
  return status === 'active';
}

function statusAccent(status: string | null): string {
  switch (status) {
    case 'active':
      return C.green;
    case 'pending':
      return C.gold;
    case 'suspended':
      return C.orange;
    case 'blocked':
      return 'var(--destructive)';
    default:
      return 'var(--muted-foreground)';
  }
}

function statusLabel(status: string | null): string {
  switch (status) {
    case 'active':
      return tx('adminUsersPage.status_active');
    case 'pending':
      return tx('adminUsersPage.status_pending');
    case 'suspended':
      return tx('adminUsersPage.status_suspended');
    case 'blocked':
      return tx('adminUsersPage.status_blocked');
    default:
      return tx('adminUsersPage.status_unknown');
  }
}

function formatDate(value: string | null): string {
  if (!value) {
    return '—';
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString();
}

export function AdminUsersPage() {
  const { user, loading: authLoading } = useLocalAuth();
  const canRead = userHasPermission(user?.role, 'users:read');
  const canWrite = userHasPermission(user?.role, 'users:write');

  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetcher = useCallback(async (page: number, limit: number) => {
    const response = await getUsers(page, limit);
    return {
      data: (Array.isArray(response?.data) ? response.data : [])
        .map(toUserRow)
        .filter((row): row is AdminUserRow => row !== null),
      meta: response?.meta ?? { total: 0, page, limit },
    };
  }, []);

  const { rows, meta, page, totalPages, loading, error, setPage, refetch } = useAdminResource(
    fetcher,
    PAGE_LIMIT,
    canRead,
  );

  const handleToggleStatus = useCallback(
    async (target: AdminUserRow) => {
      const nextStatus = isActive(target.profile_status) ? 'inactive' : 'active';
      const confirmMessage = isActive(target.profile_status)
        ? tx('adminUsersPage.deactivate_confirm')
        : tx('adminUsersPage.activate_confirm');

      if (typeof window !== 'undefined' && !window.confirm(confirmMessage)) {
        return;
      }

      setBusyUserId(target.id);
      setActionError(null);
      setSuccessMessage(null);

      try {
        await setUserStatus(target.id, nextStatus);
        setSuccessMessage(tx('adminUsersPage.updated'));
        refetch();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : tx('adminUsersPage.load_failed'));
      } finally {
        setBusyUserId(null);
      }
    },
    [refetch],
  );

  if (!authLoading && !canRead) {
    return (
      <PageShell maxWidth={1200}>
        <div style={{ padding: SPACE[6] }}>
          <AdminAccessDenied
            title={tx('adminUsersPage.access_denied')}
            description={tx('adminUsersPage.users_no_permission')}
          />
        </div>
      </PageShell>
    );
  }

  const activeCount = rows.filter(row => isActive(row.profile_status)).length;

  return (
    <PageShell maxWidth={1200}>
      <div style={{ padding: SPACE[6] }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: SPACE[4],
            marginBottom: SPACE[6],
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: SPACE[2],
                borderRadius: R.full,
                border: `1px solid ${'var(--border)'}`,
                background: C.cyanDim,
                padding: '4px 12px',
                color: 'var(--primary)',
                fontSize: TYPE.size.xs,
                fontWeight: TYPE.weight.bold,
                textTransform: 'uppercase',
                marginBottom: SPACE[2],
              }}
            >
              <UsersIcon size={12} />
              {tx('adminUsersPage.eyebrow')}
            </div>
            <h1
              style={{
                margin: 0,
                color: 'var(--foreground)',
                fontSize: TYPE.size['2xl'],
                fontWeight: TYPE.weight.ultra,
              }}
            >
              {tx('adminUsersPage.title')}
            </h1>
            <p style={{ margin: `${SPACE[2]} 0 0`, color: 'var(--muted-foreground)', fontSize: TYPE.size.sm }}>
              {tx('adminUsersPage.subtitle')}
            </p>
          </div>

          <button
            type="button"
            onClick={refetch}
            disabled={loading || !canRead}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: SPACE[2],
              padding: `${SPACE[2]} ${SPACE[4]}`,
              background: 'var(--secondary)',
              border: `1px solid ${'var(--border)'}`,
              borderRadius: R.lg,
              color: 'var(--foreground)',
              fontSize: TYPE.size.sm,
              cursor: loading || !canRead ? 'not-allowed' : 'pointer',
            }}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {tx('common.refresh')}
          </button>
        </div>

        {!canWrite && <AdminNotice tone="info">{tx('adminUsersPage.write_required')}</AdminNotice>}
        {actionError && <AdminNotice tone="error">{actionError}</AdminNotice>}
        {successMessage && <AdminNotice tone="success">{successMessage}</AdminNotice>}
        {error && <AdminNotice tone="error">{error}</AdminNotice>}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: SPACE[4],
            marginBottom: SPACE[5],
          }}
        >
          <SummaryTile label={tx('adminUsersPage.total_users')} value={meta.total} accent={'var(--primary)'} />
          <SummaryTile label={tx('adminUsersPage.active_count')} value={activeCount} accent={C.green} />
          <SummaryTile
            label={tx('adminUsersPage.inactive_count')}
            value={Math.max(0, rows.length - activeCount)}
            accent={C.orange}
          />
        </div>

        <div style={{ ...card({ padding: SPACE[2], radius: R.xxl }), overflowX: 'auto' }}>
          {loading && rows.length === 0 ? (
            <div style={{ padding: SPACE[8], textAlign: 'center', color: 'var(--muted-foreground)' }}>
              {tx('adminUsersPage.loading')}
            </div>
          ) : rows.length === 0 ? (
            <WaselEmptyState
              compact
              icon={<UsersIcon size={36} />}
              title={tx('adminUsersPage.empty')}
            />
          ) : (
            <table style={tableStyles.table}>
              <thead>
                <tr>
                  <th style={tableStyles.headCell}>{tx('adminUsersPage.column_user')}</th>
                  <th style={tableStyles.headCell}>{tx('adminUsersPage.column_role')}</th>
                  <th style={tableStyles.headCell}>{tx('adminUsersPage.column_status')}</th>
                  <th style={tableStyles.headCell}>{tx('adminUsersPage.column_joined')}</th>
                  <th style={tableStyles.headCell}>{tx('adminUsersPage.column_actions')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id}>
                    <td style={tableStyles.cell}>
                      <div style={{ color: 'var(--foreground)', fontWeight: TYPE.weight.semibold }}>
                        {row.full_name ?? '—'}
                      </div>
                      <div style={{ color: 'var(--muted-foreground)', fontSize: TYPE.size.xs, marginTop: 2 }}>
                        {row.email ?? '—'}
                      </div>
                      <div style={{ color: 'var(--muted-foreground)', fontSize: TYPE.size.xs, marginTop: 2 }}>
                        {row.phone_number ?? tx('adminUsersPage.no_phone')}
                      </div>
                    </td>
                    <td style={tableStyles.cell}>{row.role ?? '—'}</td>
                    <td style={tableStyles.cell}>
                      <StatusPill
                        label={statusLabel(row.profile_status)}
                        accent={statusAccent(row.profile_status)}
                      />
                    </td>
                    <td style={tableStyles.cell}>{formatDate(row.created_at)}</td>
                    <td style={tableStyles.cell}>
                      <AdminActionButton
                        label={
                          isActive(row.profile_status)
                            ? tx('adminUsersPage.deactivate')
                            : tx('adminUsersPage.activate')
                        }
                        accent={isActive(row.profile_status) ? C.orange : C.green}
                        disabled={!canWrite}
                        busy={busyUserId === row.id}
                        onClick={() => { void handleToggleStatus(row); }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {rows.length > 0 && (
          <AdminPager
            page={page}
            totalPages={totalPages}
            onPage={setPage}
            label={tx('adminUsersPage.page_of', { page, total: totalPages })}
            previousLabel={tx('adminUsersPage.previous')}
            nextLabel={tx('adminUsersPage.next')}
          />
        )}
      </div>
    </PageShell>
  );
}

function SummaryTile({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div
      style={{
        ...card({ padding: SPACE[4], radius: R.xl }),
        borderColor: `${accent}28`,
        display: 'flex',
        flexDirection: 'column',
        gap: SPACE[2],
      }}
    >
      <span style={{ color: 'var(--muted-foreground)', fontSize: TYPE.size.xs, fontWeight: TYPE.weight.medium }}>
        {label}
      </span>
      <span style={{ color: 'var(--foreground)', fontSize: TYPE.size['2xl'], fontWeight: TYPE.weight.ultra }}>
        {value.toLocaleString()}
      </span>
    </div>
  );
}

export default AdminUsersPage;


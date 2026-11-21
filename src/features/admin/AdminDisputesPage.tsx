import { useCallback, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { PageShell } from '../../components/wasel-ui/WaselPagePrimitives';
import { WaselEmptyState } from '../../components/wasel-ui';
import { getDisputes, resolveDispute } from '../../services/adminApi';
import { tx } from '../../locales/tx';
import { C, R, SPACE, TYPE, card } from '../../utils/wasel-ds';
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

interface AdminDisputeRow {
  id: string;
  type: string | null;
  description: string | null;
  status: string | null;
  resolution: string | null;
  complainant_id: string | null;
  respondent_id: string | null;
  created_at: string | null;
}

/** Untyped endpoint rows are normalised defensively — see AdminUsersPage. */
function toDisputeRow(raw: unknown): AdminDisputeRow | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const id = typeof row.id === 'string' ? row.id : typeof row.dispute_id === 'string' ? row.dispute_id : null;
  if (!id) {
    return null;
  }
  return {
    id,
    type: typeof row.type === 'string' ? row.type : null,
    description: typeof row.description === 'string' ? row.description : null,
    status: typeof row.status === 'string' ? row.status : null,
    resolution: typeof row.resolution === 'string' ? row.resolution : null,
    complainant_id: typeof row.complainant_id === 'string' ? row.complainant_id : null,
    respondent_id: typeof row.respondent_id === 'string' ? row.respondent_id : null,
    created_at: typeof row.created_at === 'string' ? row.created_at : null,
  };
}

function statusAccent(status: string | null): string {
  switch (status) {
    case 'resolved':
      return C.green;
    case 'closed':
      return C.textDim;
    case 'investigating':
      return C.cyan;
    case 'pending':
      return C.gold;
    default:
      return C.textDim;
  }
}

function statusLabel(status: string | null): string {
  switch (status) {
    case 'pending':
      return tx('adminDisputesPage.status_pending');
    case 'investigating':
      return tx('adminDisputesPage.status_investigating');
    case 'resolved':
      return tx('adminDisputesPage.status_resolved');
    case 'closed':
      return tx('adminDisputesPage.status_closed');
    default:
      return tx('adminDisputesPage.status_unknown');
  }
}

function isOpen(status: string | null): boolean {
  return status === 'pending' || status === 'investigating';
}

function formatDate(value: string | null): string {
  if (!value) {
    return '—';
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString();
}

function shortId(value: string | null): string {
  return value ? value.slice(0, 8) : '—';
}

export function AdminDisputesPage() {
  const { user, loading: authLoading } = useLocalAuth();
  const canRead = userHasPermission(user?.role, 'disputes:read');
  const canWrite = userHasPermission(user?.role, 'disputes:write');

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyDisputeId, setBusyDisputeId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetcher = useCallback(async (page: number, limit: number) => {
    const response = await getDisputes(page, limit);
    return {
      data: (Array.isArray(response?.data) ? response.data : [])
        .map(toDisputeRow)
        .filter((row): row is AdminDisputeRow => row !== null),
      meta: response?.meta ?? { total: 0, page, limit },
    };
  }, []);

  const { rows, meta, page, totalPages, loading, error, setPage, refetch } = useAdminResource(
    fetcher,
    PAGE_LIMIT,
    canRead,
  );

  const handleResolve = useCallback(
    async (target: AdminDisputeRow) => {
      const note = (drafts[target.id] ?? '').trim();

      if (!note) {
        setActionError(tx('adminDisputesPage.resolution_required'));
        return;
      }

      if (typeof window !== 'undefined' && !window.confirm(tx('adminDisputesPage.resolve_confirm'))) {
        return;
      }

      setBusyDisputeId(target.id);
      setActionError(null);
      setSuccessMessage(null);

      try {
        await resolveDispute(target.id, note, 'resolved');
        setDrafts(current => {
          const next = { ...current };
          delete next[target.id];
          return next;
        });
        setSuccessMessage(tx('adminDisputesPage.resolved_toast'));
        refetch();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : tx('adminDisputesPage.load_failed'));
      } finally {
        setBusyDisputeId(null);
      }
    },
    [drafts, refetch],
  );

  if (!authLoading && !canRead) {
    return (
      <PageShell maxWidth={1200}>
        <div style={{ padding: SPACE[6] }}>
          <AdminAccessDenied
            title={tx('adminDisputesPage.access_denied')}
            description={tx('adminDisputesPage.disputes_no_permission')}
          />
        </div>
      </PageShell>
    );
  }

  const openCount = rows.filter(row => isOpen(row.status)).length;
  const resolvedCount = rows.length - openCount;

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
                border: `1px solid ${C.borderHov}`,
                background: C.goldDim,
                padding: '4px 12px',
                color: C.gold,
                fontSize: TYPE.size.xs,
                fontWeight: TYPE.weight.bold,
                textTransform: 'uppercase',
                marginBottom: SPACE[2],
              }}
            >
              <AlertTriangle size={12} />
              {tx('adminDisputesPage.eyebrow')}
            </div>
            <h1
              style={{
                margin: 0,
                color: C.text,
                fontSize: TYPE.size['2xl'],
                fontWeight: TYPE.weight.ultra,
              }}
            >
              {tx('adminDisputesPage.title')}
            </h1>
            <p style={{ margin: `${SPACE[2]} 0 0`, color: C.textMuted, fontSize: TYPE.size.sm }}>
              {tx('adminDisputesPage.subtitle')}
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
              background: C.elevated,
              border: `1px solid ${C.border}`,
              borderRadius: R.lg,
              color: C.textSub,
              fontSize: TYPE.size.sm,
              cursor: loading || !canRead ? 'not-allowed' : 'pointer',
            }}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {tx('common.refresh')}
          </button>
        </div>

        {!canWrite && <AdminNotice tone="info">{tx('adminDisputesPage.write_required')}</AdminNotice>}
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
          <SummaryTile
            label={tx('adminDisputesPage.total_disputes')}
            value={meta.total}
            accent={C.cyan}
          />
          <SummaryTile label={tx('adminDisputesPage.open_count')} value={openCount} accent={C.gold} />
          <SummaryTile
            label={tx('adminDisputesPage.resolved_count')}
            value={resolvedCount}
            accent={C.green}
          />
        </div>

        <div style={{ ...card({ padding: SPACE[2], radius: R.xxl }), overflowX: 'auto' }}>
          {loading && rows.length === 0 ? (
            <div style={{ padding: SPACE[8], textAlign: 'center', color: C.textMuted }}>
              {tx('adminDisputesPage.loading')}
            </div>
          ) : rows.length === 0 ? (
            <WaselEmptyState
              compact
              icon={<AlertTriangle size={36} />}
              title={tx('adminDisputesPage.empty')}
            />
          ) : (
            <table style={tableStyles.table}>
              <thead>
                <tr>
                  <th style={tableStyles.headCell}>{tx('adminDisputesPage.column_case')}</th>
                  <th style={tableStyles.headCell}>{tx('adminDisputesPage.column_parties')}</th>
                  <th style={tableStyles.headCell}>{tx('adminDisputesPage.column_status')}</th>
                  <th style={tableStyles.headCell}>{tx('adminDisputesPage.column_opened')}</th>
                  <th style={tableStyles.headCell}>{tx('adminDisputesPage.column_resolution')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id}>
                    <td style={tableStyles.cell}>
                      <div style={{ color: C.text, fontWeight: TYPE.weight.semibold }}>
                        {row.type ?? '—'}
                      </div>
                      <div style={{ color: C.textDim, fontSize: TYPE.size.xs, marginTop: 2 }}>
                        {shortId(row.id)}
                      </div>
                      <div
                        style={{
                          color: C.textMuted,
                          fontSize: TYPE.size.xs,
                          marginTop: SPACE[2],
                          maxWidth: 280,
                        }}
                      >
                        {row.description ?? tx('adminDisputesPage.no_description')}
                      </div>
                    </td>
                    <td style={tableStyles.cell}>
                      <div style={{ color: C.textSub, fontSize: TYPE.size.xs }}>
                        {shortId(row.complainant_id)}
                      </div>
                      <div style={{ color: C.textDim, fontSize: TYPE.size.xs, marginTop: 2 }}>
                        {shortId(row.respondent_id)}
                      </div>
                    </td>
                    <td style={tableStyles.cell}>
                      <StatusPill label={statusLabel(row.status)} accent={statusAccent(row.status)} />
                    </td>
                    <td style={tableStyles.cell}>{formatDate(row.created_at)}</td>
                    <td style={{ ...tableStyles.cell, minWidth: 280 }}>
                      {row.resolution ? (
                        <div style={{ color: C.textSub, fontSize: TYPE.size.xs }}>{row.resolution}</div>
                      ) : isOpen(row.status) ? (
                        <ResolutionEditor
                          value={drafts[row.id] ?? ''}
                          disabled={!canWrite}
                          busy={busyDisputeId === row.id}
                          onChange={value => {
                            setDrafts(current => ({ ...current, [row.id]: value }));
                          }}
                          onResolve={() => { void handleResolve(row); }}
                        />
                      ) : (
                        <span style={{ color: C.textDim, fontSize: TYPE.size.xs }}>—</span>
                      )}
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
            label={tx('adminDisputesPage.page_of', { page, total: totalPages })}
            previousLabel={tx('adminDisputesPage.previous')}
            nextLabel={tx('adminDisputesPage.next')}
          />
        )}
      </div>
    </PageShell>
  );
}

function ResolutionEditor({
  value,
  disabled,
  busy,
  onChange,
  onResolve,
}: {
  value: string;
  disabled: boolean;
  busy: boolean;
  onChange: (value: string) => void;
  onResolve: () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE[2] }}>
      <textarea
        value={value}
        onChange={event => { onChange(event.target.value); }}
        disabled={disabled || busy}
        rows={2}
        placeholder={tx('adminDisputesPage.resolution_placeholder')}
        style={{
          width: '100%',
          resize: 'vertical',
          padding: SPACE[2],
          borderRadius: R.md,
          border: `1px solid ${C.border}`,
          background: C.bgAlt,
          color: C.text,
          fontSize: TYPE.size.xs,
          fontFamily: 'inherit',
        }}
      />
      <div>
        <AdminActionButton
          label={tx('adminDisputesPage.resolve')}
          accent={C.green}
          disabled={disabled}
          busy={busy}
          onClick={onResolve}
        />
      </div>
    </div>
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
      <span style={{ color: C.textMuted, fontSize: TYPE.size.xs, fontWeight: TYPE.weight.medium }}>
        {label}
      </span>
      <span style={{ color: C.text, fontSize: TYPE.size['2xl'], fontWeight: TYPE.weight.ultra }}>
        {value.toLocaleString()}
      </span>
    </div>
  );
}

export default AdminDisputesPage;

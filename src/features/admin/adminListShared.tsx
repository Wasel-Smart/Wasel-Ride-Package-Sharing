import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { R, SPACE, TYPE, card  } from '../../utils/wasel-ds';

export interface AdminListMeta {
  total: number;
  page: number;
  limit: number;
}

export interface AdminListResponse<T> {
  data: T[];
  meta: AdminListMeta;
}

/**
 * Paginated fetch loop shared by the admin list pages.
 *
 * `fetcher` must be referentially stable (wrap it in useCallback at the call
 * site) or the effect will re-run on every render.
 */
export function useAdminResource<T>(
  fetcher: (page: number, limit: number) => Promise<AdminListResponse<T>>,
  limit: number,
  enabled: boolean,
) {
  const [rows, setRows] = useState<T[]>([]);
  const [meta, setMeta] = useState<AdminListMeta>({ total: 0, page: 1, limit });
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  // Tracks which request has already settled so `loading` can be *derived*
  // instead of flipped inside the effect — a synchronous setState in an effect
  // body triggers a cascading render on every page change.
  const [settledKey, setSettledKey] = useState<string | null>(null);

  const refetch = useCallback(() => {
    setReloadToken(token => token + 1);
  }, []);

  const requestKey = enabled ? `${page}:${limit}:${reloadToken}` : null;
  const loading = requestKey !== null && settledKey !== requestKey;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetcher(page, limit);
        if (cancelled) {
          return;
        }
        setRows(Array.isArray(response.data) ? response.data : []);
        setMeta(response.meta ?? { total: 0, page, limit });
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setRows([]);
          setError(err instanceof Error ? err.message : 'request_failed');
        }
      } finally {
        if (!cancelled) {
          setSettledKey(`${page}:${limit}:${reloadToken}`);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, fetcher, limit, page, reloadToken]);

  const totalPages = Math.max(1, Math.ceil((meta.total || 0) / (meta.limit || limit)));

  return { rows, meta, page, totalPages, loading, error, setPage, refetch };
}

export const tableStyles: Record<string, CSSProperties> = {
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: TYPE.size.sm,
  },
  headCell: {
    textAlign: 'left',
    padding: `${SPACE[3]} ${SPACE[4]}`,
    color: 'var(--muted-foreground)',
    fontSize: TYPE.size.xs,
    fontWeight: TYPE.weight.bold,
    textTransform: 'uppercase',
    borderBottom: `1px solid ${'var(--border)'}`,
    whiteSpace: 'nowrap',
  },
  cell: {
    padding: `${SPACE[4]}`,
    borderBottom: `1px solid ${'var(--border)'}`,
    color: 'var(--foreground)',
    verticalAlign: 'top',
  },
};

export function AdminAccessDenied({ title, description }: { title: string; description: string }) {
  return (
    <div
      style={{
        ...card({ padding: SPACE[8], radius: R.xxl }),
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: SPACE[2],
      }}
    >
      <h2 style={{ margin: 0, color: 'var(--destructive)', fontSize: TYPE.size.xl, fontWeight: TYPE.weight.ultra }}>
        {title}
      </h2>
      <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: TYPE.size.base }}>{description}</p>
    </div>
  );
}

export function AdminNotice({
  tone,
  children,
}: {
  tone: 'info' | 'error' | 'success';
  children: ReactNode;
}) {
  const accent = tone === 'error' ? 'var(--destructive)' : tone === 'success' ? C.green : C.gold;
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      style={{
        ...card({ padding: SPACE[3], radius: R.lg }),
        borderColor: `${accent}44`,
        background: `${accent}12`,
        color: accent,
        fontSize: TYPE.size.sm,
        marginBottom: SPACE[4],
      }}
    >
      {children}
    </div>
  );
}

export function AdminPager({
  page,
  totalPages,
  onPage,
  label,
  previousLabel,
  nextLabel,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
  label: string;
  previousLabel: string;
  nextLabel: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: SPACE[3],
        marginTop: SPACE[4],
      }}
    >
      <span style={{ color: 'var(--muted-foreground)', fontSize: TYPE.size.xs }}>{label}</span>
      <PagerButton label={previousLabel} disabled={page <= 1} onClick={() => { onPage(page - 1); }} />
      <PagerButton
        label={nextLabel}
        disabled={page >= totalPages}
        onClick={() => { onPage(page + 1); }}
      />
    </div>
  );
}

function PagerButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: `${SPACE[2]} ${SPACE[4]}`,
        borderRadius: R.lg,
        border: `1px solid ${'var(--border)'}`,
        background: disabled ? 'transparent' : 'var(--secondary)',
        color: disabled ? 'var(--muted-foreground)' : 'var(--foreground)',
        fontSize: TYPE.size.sm,
        fontWeight: TYPE.weight.semibold,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {label}
    </button>
  );
}

export function StatusPill({ label, accent }: { label: string; accent: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 10px',
        borderRadius: R.full,
        background: `${accent}14`,
        border: `1px solid ${accent}28`,
        color: accent,
        fontSize: TYPE.size.xs,
        fontWeight: TYPE.weight.bold,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}

export function AdminActionButton({
  label,
  accent,
  disabled,
  busy,
  onClick,
}: {
  label: string;
  accent: string;
  disabled?: boolean;
  busy?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      style={{
        padding: `${SPACE[2]} ${SPACE[4]}`,
        borderRadius: R.lg,
        border: `1px solid ${accent}44`,
        background: `${accent}14`,
        color: disabled ? 'var(--muted-foreground)' : accent,
        fontSize: TYPE.size.xs,
        fontWeight: TYPE.weight.bold,
        cursor: disabled || busy ? 'not-allowed' : 'pointer',
        opacity: busy ? 0.6 : 1,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}


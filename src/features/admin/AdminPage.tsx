import { useEffect, useState } from 'react';
import { KVStoreAdmin } from '../../components/admin/KVStoreAdmin';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { driverApprovalAdminAPI, type PendingDriverApproval } from '../../services/driverApprovalAdmin';
import { PageShell, Protected } from '../shared/pageShared';

function formatTimestamp(value: string | null) {
  if (!value) {
    return 'Unknown';
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

export default function AdminPage() {
  const { user, refreshAuthState } = useLocalAuth();
  const [pendingDrivers, setPendingDrivers] = useState<PendingDriverApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvingDriverId, setApprovingDriverId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== 'admin') {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadPendingDrivers = async () => {
      try {
        setLoading(true);
        setError(null);
        const rows = await driverApprovalAdminAPI.listPending();
        if (!cancelled) {
          setPendingDrivers(rows);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : 'Failed to load pending drivers.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadPendingDrivers();

    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  const handleRefresh = async () => {
    if (user?.role !== 'admin') {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const rows = await driverApprovalAdminAPI.listPending();
      setPendingDrivers(rows);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to load pending drivers.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (driver: PendingDriverApproval) => {
    try {
      setApprovingDriverId(driver.driverId);
      setError(null);
      setStatusMessage(null);
      await driverApprovalAdminAPI.approve(driver.driverId);
      setPendingDrivers((current) => current.filter((entry) => entry.driverId !== driver.driverId));
      setStatusMessage(`${driver.fullName} is now approved.`);
      await refreshAuthState();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to approve driver.');
    } finally {
      setApprovingDriverId(null);
    }
  };

  return (
    <Protected>
      <PageShell>
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-8 pt-4 md:px-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h1 className="text-2xl font-semibold text-foreground">Admin</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Driver approval belongs here because it is a privileged backend action, not a client-side toggle.
            </p>
          </div>

          {user?.role !== 'admin' ? (
            <div className="rounded-3xl border border-amber-400/25 bg-amber-400/10 p-6 text-sm text-amber-50">
              This page is restricted to admin accounts.
            </div>
          ) : (
            <>
              <section className="rounded-3xl border border-white/10 bg-background/80 p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Driver approval queue</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Only drivers with contact details and at least Level 2 verification are approval-ready.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRefresh()}
                    className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-white/10"
                  >
                    Refresh queue
                  </button>
                </div>

                {statusMessage ? (
                  <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                    {statusMessage}
                  </div>
                ) : null}

                {error ? (
                  <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                    {error}
                  </div>
                ) : null}

                {loading ? (
                  <div className="mt-6 text-sm text-muted-foreground">Loading pending drivers...</div>
                ) : pendingDrivers.length === 0 ? (
                  <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-muted-foreground">
                    No drivers are waiting for approval.
                  </div>
                ) : (
                  <div className="mt-6 grid gap-4">
                    {pendingDrivers.map((driver) => {
                      const isApproving = approvingDriverId === driver.driverId;
                      return (
                        <article
                          key={driver.driverId}
                          className="rounded-2xl border border-white/10 bg-white/5 p-5"
                        >
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-3">
                              <div>
                                <div className="text-lg font-semibold text-foreground">{driver.fullName}</div>
                                <div className="mt-1 text-sm text-muted-foreground">
                                  {driver.email ?? 'No email'} • {driver.phoneNumber ?? 'No phone'}
                                </div>
                              </div>

                              <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                                <div>Driver status: <span className="text-foreground">{driver.driverStatus}</span></div>
                                <div>Verification: <span className="text-foreground">{driver.verificationLevel}</span></div>
                                <div>Sanad: <span className="text-foreground">{driver.sanadStatus ?? 'Not verified yet'}</span></div>
                                <div>Updated: <span className="text-foreground">{formatTimestamp(driver.updatedAt ?? driver.createdAt)}</span></div>
                              </div>

                              <div
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                  driver.readyForApproval
                                    ? 'border border-emerald-400/25 bg-emerald-400/10 text-emerald-100'
                                    : 'border border-amber-400/25 bg-amber-400/10 text-amber-100'
                                }`}
                              >
                                {driver.readyForApproval ? 'Ready for approval' : 'Needs more verification first'}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => void handleApprove(driver)}
                              disabled={!driver.readyForApproval || isApproving}
                              className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
                            >
                              {isApproving ? 'Approving...' : 'Approve driver'}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-white/10 bg-background/80 p-6">
                <KVStoreAdmin />
              </section>
            </>
          )}
        </div>
      </PageShell>
    </Protected>
  );
}

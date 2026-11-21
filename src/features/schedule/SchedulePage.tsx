import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Car,
  Package,
  Navigation2,
  Plus,
  X,
  RefreshCw,
  CheckCircle,
} from 'lucide-react';
import { supabase } from '../../utils/supabase/client';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { C,  F, R, TYPE  } from '../../utils/wasel-ds';
import { PageShell, SectionCard } from '../../components/wasel-ui/WaselPagePrimitives';
import { WaselEmptyState } from '../../components/wasel-ui/WaselEmptyState';
import { ListSkeleton } from '../home/HomePageShared';
import { ScheduleItemCard } from './ScheduleItemCard';

export type ScheduleItem = {
  id: string;
  item_type: 'ride' | 'package_delivery' | 'package_return';
  status: string;
  pickup_location: string;
  pickup_lat?: number;
  pickup_lng?: number;
  dropoff_location?: string;
  dropoff_lat?: number;
  dropoff_lng?: number;
  scheduled_at: string;
  recurring_pattern: string;
  notes?: string;
  user_id?: string;
  contact_name?: string;
  contact_phone?: string;
  estimated_price?: number;
};

const LOCAL_KEY = 'wasel-scheduled-items-v1';

/** Where the rows currently on screen came from. */
type ScheduleDataSource = 'server' | 'local';

const STATUS_LABEL: Record<string, { en: string; ar: string; color: string }> = {
  scheduled: { en: 'Scheduled', ar: 'مجدول', color: 'var(--primary)' },
  confirmed: { en: 'Confirmed', ar: 'مؤكد', color: C.green },
  completed: { en: 'Completed', ar: 'مكتمل', color: C.green },
  cancelled: { en: 'Cancelled', ar: 'ملغي', color: 'var(--destructive)' },
  missed: { en: 'Missed', ar: 'فائت', color: C.gold },
};

const EMPTY_FORM: ScheduleItem = {
  id: '',
  item_type: 'ride',
  status: 'scheduled',
  pickup_location: '',
  pickup_lat: undefined,
  pickup_lng: undefined,
  dropoff_location: '',
  dropoff_lat: undefined,
  dropoff_lng: undefined,
  scheduled_at: '',
  recurring_pattern: 'none',
  notes: '',
  user_id: undefined,
  contact_name: '',
  contact_phone: '',
  estimated_price: undefined,
};

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000,
    });
  });
}

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: R.sm,
  background: 'var(--secondary)',
  border: `1px solid ${'var(--border)'}`,
  color: 'var(--foreground)',
  fontFamily: F,
  fontSize: TYPE.size.base,
  boxSizing: 'border-box' as const,
};

const labelStyle = {
  color: 'var(--muted-foreground)',
  fontSize: TYPE.size.xs,
  fontWeight: TYPE.weight.bold,
  textTransform: 'uppercase' as const,
  letterSpacing: TYPE.letterSpacing.wider,
  marginBottom: 6,
  display: 'block',
  fontFamily: F,
};

export function SchedulePage() {
  const { user } = useLocalAuth();
  const { language, t } = useLanguage();
  const ar = language === 'ar';

  const [showForm, setShowForm] = useState(false);
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [dataSource, setDataSource] = useState<ScheduleDataSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [locationCaptured, setLocationCaptured] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showAllPast, setShowAllPast] = useState(false);
  const [form, setForm] = useState<ScheduleItem>({ ...EMPTY_FORM, user_id: user?.id });

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      if (supabase && user?.id) {
        const { data, error: supabaseError } = await supabase
          .from('scheduled_pickups')
          .select('*')
          .eq('user_id', user.id)
          .order('scheduled_at', { ascending: true });

        if (supabaseError) {throw supabaseError;}
        // A successful query is authoritative — including an empty one. Falling
        // through to the local cache here resurrected rows the user deleted.
        const mapped: ScheduleItem[] = (data ?? []).map((row: Record<string, unknown>) => ({
          id: row.id as string,
          item_type: row.item_type as ScheduleItem['item_type'],
          status: row.status as string,
          pickup_location: row.pickup_location as string,
          pickup_lat: row.pickup_lat as number | undefined,
          pickup_lng: row.pickup_lng as number | undefined,
          dropoff_location: row.dropoff_location as string | undefined,
          dropoff_lat: row.dropoff_lat as number | undefined,
          dropoff_lng: row.dropoff_lng as number | undefined,
          scheduled_at: row.scheduled_at as string,
          recurring_pattern: row.recurring_pattern as string,
          notes: row.notes as string | undefined,
          user_id: row.user_id as string | undefined,
          contact_name: row.contact_name as string | undefined,
          contact_phone: row.contact_phone as string | undefined,
          estimated_price: row.estimated_price as number | undefined,
        }));
        setItems(mapped);
        localStorage.setItem(LOCAL_KEY, JSON.stringify(mapped));
        setDataSource('server');
        setLoading(false);
        return;
      }
    } catch {
      // Fall through to the on-device copy below, flagged as stale.
    }

    const stored = localStorage.getItem(LOCAL_KEY);
    if (stored) {
      try {
        setItems(JSON.parse(stored));
        setDataSource('local');
      } catch {
        /* ignore */
      }
    }
    setLoading(false);
  }, [user?.id]);

  /**
   * Supabase-first write strategy (mirrors rideLifecycle.ts).
   * - If Supabase is available: write there first. On success, update the
   *   localStorage read-through cache and update state.
   * - If Supabase is unavailable or the user is unauthenticated: throw so
   *   the caller can surface a real error. We never silently write only to
   *   localStorage for a schedule item — a "saved" item that never reached
   *   the server would vanish on the next full reload.
   * - Guest/unauthenticated users cannot schedule (the Protected wrapper
   *   above the page already enforces sign-in; this is a belt-and-braces guard).
   */
  const persist = async (next: ScheduleItem[]): Promise<void> => {
    if (!supabase || !user?.id) {
      throw new Error('Sign in to save scheduled items to your account.');
    }

    const payload = next.map(item => ({
      id: item.id,
      user_id: user.id,
      item_type: item.item_type,
      status: item.status,
      pickup_location: item.pickup_location,
      pickup_lat: item.pickup_lat ?? 0,
      pickup_lng: item.pickup_lng ?? 0,
      dropoff_location: item.dropoff_location ?? null,
      dropoff_lat: item.dropoff_lat ?? null,
      dropoff_lng: item.dropoff_lng ?? null,
      scheduled_at: item.scheduled_at,
      recurring_pattern: item.recurring_pattern,
      notes: item.notes ?? null,
      contact_name: item.contact_name ?? null,
      contact_phone: item.contact_phone ?? null,
      estimated_price: item.estimated_price ?? null,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('scheduled_pickups')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      // Propagate so callers (handleCreate / handleCancel) can show the user
      // a real error rather than silently losing the write.
      throw new Error(error.message ?? 'Failed to save schedule item. Please try again.');
    }

    // Server write confirmed — update the read-through cache and local state.
    localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
    setItems(next);
    setDataSource('server');
  };

  const handleGeolocate = async () => {
    setLocating(true);
    setLocationCaptured(false);
    try {
      const pos = await getCurrentPosition();
      setForm(f => ({
        ...f,
        pickup_lat: pos.coords.latitude,
        pickup_lng: pos.coords.longitude,
      }));
      setLocationCaptured(true);
    } catch {
      // location unavailable; user can proceed without coordinates
    }
    setLocating(false);
  };

  const [persistError, setPersistError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!form.pickup_location || !form.scheduled_at) {return;}
    const newItem: ScheduleItem = {
      ...form,
      id: crypto.randomUUID(),
      status: 'scheduled',
      pickup_lat: form.pickup_lat ?? 0,
      pickup_lng: form.pickup_lng ?? 0,
      user_id: user?.id,
    };
    setPersistError(null);
    try {
      await persist([newItem, ...items]);
      setShowForm(false);
      setLocationCaptured(false);
      setForm({ ...EMPTY_FORM, user_id: user?.id });
    } catch (err) {
      setPersistError(err instanceof Error ? err.message : 'Could not save the schedule item. Please try again.');
    }
  };

  const handleCancel = async (id: string) => {
    setPersistError(null);
    try {
      await persist(items.map(i => (i.id === id ? { ...i, status: 'cancelled' } : i)));
      setCancellingId(null);
    } catch (err) {
      setPersistError(err instanceof Error ? err.message : 'Could not cancel the item. Please try again.');
      setCancellingId(null);
    }
  };

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const upcoming = useMemo(
    () =>
      items
        .filter(i => i.status !== 'cancelled' && i.status !== 'completed')
        .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)),
    [items],
  );

  const past = useMemo(
    () =>
      items
        .filter(i => i.status === 'cancelled' || i.status === 'completed')
        .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at)),
    [items],
  );

  const typeLabel = (type: ScheduleItem['item_type']) => {
    if (type === 'ride') {return t('scheduleExpanded.ride');}
    if (type === 'package_delivery') {return t('scheduleExpanded.typeDelivery');}
    return t('scheduleExpanded.typeReturn');
  };

  const typeColor = (t: ScheduleItem['item_type']) => {
    if (t === 'ride') {return 'var(--primary)';}
    if (t === 'package_delivery') {return C.gold;}
    return C.green;
  };

  const visiblePast = showAllPast ? past : past.slice(0, 5);

  return (
    <PageShell>
      <SectionCard
        title={t('scheduleExpanded.schedule')}
        subtitle={t('scheduleExpanded.planTripsAndPickupsInAdvance')}
        action={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={() => void loadItems()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 14px',
                borderRadius: R.md,
                background: 'var(--secondary)',
                border: `1px solid ${'var(--border)'}`,
                color: 'var(--foreground)',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} />
            </button>
            <button
              onClick={() => { void setShowForm(true); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: R.md,
                background: 'var(--primary)',
                border: 'none',
                color: 'var(--background)',
                fontWeight: TYPE.weight.bold,
                fontFamily: F,
                fontSize: TYPE.size.sm,
                cursor: 'pointer',
                boxShadow: `0 10px 24px ${'var(--primary)'}24`,
              }}
            >
              <Plus size={16} />
              {t('scheduleExpanded.newSchedule')}
            </button>
          </div>
        }
      >
        <div style={{ height: 4 }} />
      </SectionCard>

      {/* ── Persist error banner ── */}
      {persistError && (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 16px',
            marginBottom: 16,
            borderRadius: R.md,
            border: `1px solid ${'var(--destructive)'}44`,
            background: `${'var(--destructive)'}12`,
            color: 'var(--destructive)',
            fontSize: TYPE.size.xs,
            fontFamily: F,
            lineHeight: 1.6,
          }}
        >
          <AlertCircle size={14} />
          {persistError}
        </div>
      )}

      {/* Rows below came from the on-device copy, not the account — say so. */}
      {!loading && dataSource === 'local' && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 16px',
            marginBottom: 16,
            borderRadius: R.md,
            border: `1px solid ${C.gold}44`,
            background: `${C.gold}14`,
            color: C.gold,
            fontSize: TYPE.size.xs,
            fontFamily: F,
            lineHeight: 1.6,
          }}
        >
          <RefreshCw size={14} />
          {t('scheduleExpanded.showingSavedCopy')}
        </div>
      )}

      {/* ── New schedule form ── */}
      {showForm && (
        <SectionCard
          title={t('scheduleExpanded.newScheduledItem')}
          action={
            <button
              onClick={() => {
                setShowForm(false);
                setLocationCaptured(false);
                setForm({ ...EMPTY_FORM, user_id: user?.id });
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--muted-foreground)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={18} />
            </button>
          }
        >
          <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
            {/* Type */}
            <div>
              <label htmlFor="schedule-type" style={labelStyle}>{t('scheduleExpanded.type')}</label>
              <select
                id="schedule-type"
                value={form.item_type}
                onChange={e =>
                  setForm({ ...form, item_type: e.target.value as ScheduleItem['item_type'] })
                }
                style={inputStyle}
              >
                <option value="ride">{t('scheduleExpanded.rideOption')}</option>
                <option value="package_delivery">{t('scheduleExpanded.packageDelivery')}</option>
                <option value="package_return">{t('scheduleExpanded.packageReturn')}</option>
              </select>
            </div>

            {/* Pickup location */}
            <div>
              <label htmlFor="schedule-pickup-location" style={labelStyle}>{t('scheduleExpanded.pickupLocation')}</label>
              <input
                id="schedule-pickup-location"
                value={form.pickup_location}
                onChange={e => setForm({ ...form, pickup_location: e.target.value })}
                placeholder={t('scheduleExpanded.enterPickupLocation')}
                style={inputStyle}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => void handleGeolocate()}
                  disabled={locating}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: R.sm,
                    background: 'var(--secondary)',
                    border: `1px solid ${'var(--border)'}`,
                    color: locating ? 'var(--muted-foreground)' : 'var(--primary)',
                    cursor: locating ? 'not-allowed' : 'pointer',
                    fontFamily: F,
                    fontSize: TYPE.size.xs,
                  }}
                >
                  <Navigation2 size={12} />
                  {locating ? t('scheduleExpanded.locating') : t('scheduleExpanded.useMyLocation')}
                </button>
                {locationCaptured && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 10px',
                      borderRadius: R.full,
                      background: `${C.green}14`,
                      border: `1px solid ${C.green}28`,
                      color: C.green,
                      fontSize: TYPE.size.xs,
                      fontWeight: TYPE.weight.bold,
                    }}
                  >
                    <CheckCircle size={11} />
                    {t('scheduleExpanded.locationCaptured')}
                  </span>
                )}
              </div>
            </div>

            {/* Dropoff */}
            <div>
              <label htmlFor="schedule-dropoff-location" style={labelStyle}>{t('scheduleExpanded.dropoffLocation')}</label>
              <input
                id="schedule-dropoff-location"
                value={form.dropoff_location}
                onChange={e => setForm({ ...form, dropoff_location: e.target.value })}
                placeholder={t('scheduleExpanded.enterDropoffLocation')}
                style={inputStyle}
              />
            </div>

            {/* Date & time */}
            <div>
              <label htmlFor="schedule-date-time" style={labelStyle}>{t('scheduleExpanded.dateAndTime')}</label>
              <input
                id="schedule-date-time"
                type="datetime-local"
                value={form.scheduled_at}
                onChange={e => setForm({ ...form, scheduled_at: e.target.value })}
                style={inputStyle}
              />
            </div>

            {/* Recurrence */}
            <div>
              <label htmlFor="schedule-recurrence" style={labelStyle}>{t('scheduleExpanded.recurrence')}</label>
              <select
                id="schedule-recurrence"
                value={form.recurring_pattern}
                onChange={e => setForm({ ...form, recurring_pattern: e.target.value })}
                style={inputStyle}
              >
                <option value="none">{t('scheduleExpanded.oneTime')}</option>
                <option value="daily">{t('scheduleExpanded.daily')}</option>
                <option value="weekly">{t('scheduleExpanded.weekly')}</option>
                <option value="biweekly">{t('scheduleExpanded.biweekly')}</option>
                <option value="monthly">{t('scheduleExpanded.monthly')}</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="schedule-notes" style={labelStyle}>{t('scheduleExpanded.notes')}</label>
              <textarea
                id="schedule-notes"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder={t('scheduleExpanded.additionalNotesOptional')}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            <button
              onClick={() => void handleCreate()}
              disabled={!form.pickup_location || !form.scheduled_at}
              style={{
                padding: '12px',
                borderRadius: R.md,
                background: 'var(--primary)',
                border: 'none',
                color: 'var(--background)',
                fontWeight: TYPE.weight.ultra,
                fontFamily: F,
                fontSize: TYPE.size.base,
                cursor: !form.pickup_location || !form.scheduled_at ? 'not-allowed' : 'pointer',
                opacity: !form.pickup_location || !form.scheduled_at ? 0.5 : 1,
                boxShadow: `0 10px 24px ${'var(--primary)'}24`,
              }}
            >
              {t('scheduleExpanded.confirmSchedule')}
            </button>
          </div>
        </SectionCard>
      )}

      {/* ── Upcoming ── */}
      {loading && upcoming.length === 0 ? (
        <SectionCard
          title={t('scheduleExpanded.scheduling')}
          subtitle={t('scheduleExpanded.loadingYourSchedule')}
        >
          <ListSkeleton count={3} />
        </SectionCard>
      ) : upcoming.length > 0 ? (
        <SectionCard title={t('scheduleExpanded.upcoming')} contentPadding="0">
          <div style={{ display: 'grid', gap: 0 }}>
            {upcoming.map(item => {
              return (
                <ScheduleItemCard
                  key={item.id}
                  item={item}
                  ar={ar}
                  isCancelling={cancellingId === item.id}
                  onToggleCancel={() => void setCancellingId(cancellingId === item.id ? null : item.id)}
                  onConfirmCancel={handleCancel}
                  onDismissCancel={() => void setCancellingId(null)}
                  t={t}
                />
              );
            })}
          </div>
        </SectionCard>
      ) : !loading ? (
        <WaselEmptyState
          icon={<Calendar size={32} />}
          title={t('scheduleExpanded.scheduling')}
          description={t('scheduleExpanded.noScheduledRidesOrDeliveries')}
        />
      ) : null}

      {/* ── Past ── */}
      {past.length > 0 && (
        <SectionCard title={t('scheduleExpanded.past')} contentPadding="0">
          <div style={{ display: 'grid', gap: 0 }}>
            {visiblePast.map(item => {
              const typeCol = typeColor(item.item_type);
              const statusEntry = STATUS_LABEL[item.status];
              const statusColor = statusEntry?.color ?? 'var(--muted-foreground)';
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '12px 16px',
                    borderBottom: `1px solid ${'var(--border)'}`,
                    opacity: 0.7,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      background: `${typeCol}10`,
                      display: 'grid',
                      placeItems: 'center',
                      color: 'var(--muted-foreground)',
                      flexShrink: 0,
                    }}
                  >
                    {item.item_type === 'ride' ? <Car size={16} /> : <Package size={16} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: TYPE.weight.bold,
                        color: 'var(--foreground)',
                        fontFamily: F,
                        fontSize: TYPE.size.sm,
                      }}
                    >
                      {typeLabel(item.item_type)} — {item.pickup_location}
                    </div>
                    <div
                      style={{
                        color: 'var(--muted-foreground)',
                        fontSize: TYPE.size.xs,
                        marginTop: 2,
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center',
                      }}
                    >
                      {new Date(item.scheduled_at).toLocaleString()}
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 99,
                          background: `${statusColor}14`,
                          border: `1px solid ${statusColor}28`,
                          color: statusColor,
                          fontSize: TYPE.size.xs,
                          fontWeight: TYPE.weight.bold,
                        }}
                      >
                        {statusEntry ? (ar ? statusEntry.ar : statusEntry.en) : item.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {past.length > 5 && (
            <div style={{ padding: '12px 16px', borderTop: `1px solid ${'var(--border)'}` }}>
              <button
                onClick={() => { void setShowAllPast(v => !v); }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--primary)',
                  fontSize: TYPE.size.sm,
                  fontWeight: TYPE.weight.bold,
                  cursor: 'pointer',
                  fontFamily: F,
                }}
              >
                {showAllPast
                  ? t('scheduleExpanded.showLess')
                  : t('scheduleExpanded.showAll').replace('{count}', String(past.length))}
              </button>
            </div>
          )}
        </SectionCard>
      )}
    </PageShell>
  );
}




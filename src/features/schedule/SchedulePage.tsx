import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, MapPin, Navigation2, Plus, Trash2, X, ArrowRight, Car, Package, RefreshCw, CheckCircle } from 'lucide-react';
import { supabase } from '../../utils/supabase/client';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { C, F, R, TYPE } from '../../utils/wasel-ds';
import { PageShell, SectionCard } from '../../components/wasel-ui/WaselPagePrimitives';

type ScheduleItem = {
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

const STATUS_LABEL: Record<string, { en: string; ar: string; color: string }> = {
  scheduled:  { en: 'Scheduled',  ar: 'مجدول',    color: C.cyan },
  confirmed:  { en: 'Confirmed',  ar: 'مؤكد',     color: C.green },
  completed:  { en: 'Completed',  ar: 'مكتمل',    color: C.green },
  cancelled:  { en: 'Cancelled',  ar: 'ملغي',     color: C.error },
  missed:     { en: 'Missed',     ar: 'فائت',     color: C.gold },
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
  background: C.elevated,
  border: `1px solid ${C.border}`,
  color: C.text,
  fontFamily: F,
  fontSize: TYPE.size.base,
  boxSizing: 'border-box' as const,
};

const labelStyle = {
  color: C.textMuted,
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
  const { language } = useLanguage();
  const ar = language === 'ar';

  const [showForm, setShowForm] = useState(false);
  const [items, setItems] = useState<ScheduleItem[]>([]);
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

        if (supabaseError) throw supabaseError;
        if (data && data.length > 0) {
          const mapped: ScheduleItem[] = data.map((row: Record<string, unknown>) => ({
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
          setLoading(false);
          return;
        }
      }
    } catch {
      // fall back to local
    }

    const stored = localStorage.getItem(LOCAL_KEY);
    if (stored) {
      try { setItems(JSON.parse(stored)); } catch { /* ignore */ }
    }
    setLoading(false);
  }, [user?.id]);

  const persist = async (next: ScheduleItem[]) => {
    setItems(next);
    if (supabase && user?.id) {
      try {
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
        if (!error) {
          localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
          return;
        }
      } catch { /* fall back */ }
    }
    localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
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

  const handleCreate = async () => {
    if (!form.pickup_location || !form.scheduled_at) return;
    const newItem: ScheduleItem = {
      ...form,
      id: crypto.randomUUID(),
      status: 'scheduled',
      pickup_lat: form.pickup_lat ?? 0,
      pickup_lng: form.pickup_lng ?? 0,
      user_id: user?.id,
    };
    await persist([newItem, ...items]);
    setShowForm(false);
    setLocationCaptured(false);
    setForm({ ...EMPTY_FORM, user_id: user?.id });
  };

  const handleCancel = async (id: string) => {
    await persist(items.map(i => (i.id === id ? { ...i, status: 'cancelled' } : i)));
    setCancellingId(null);
  };

  useEffect(() => { void loadItems(); }, [loadItems]);

  const upcoming = useMemo(
    () => items
      .filter(i => i.status !== 'cancelled' && i.status !== 'completed')
      .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)),
    [items],
  );

  const past = useMemo(
    () => items
      .filter(i => i.status === 'cancelled' || i.status === 'completed')
      .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at)),
    [items],
  );

  const typeLabel = (t: ScheduleItem['item_type']) => {
    if (t === 'ride') return ar ? 'رحلة' : 'Ride';
    if (t === 'package_delivery') return ar ? 'توصيل' : 'Delivery';
    return ar ? 'إرجاع' : 'Return';
  };

  const typeColor = (t: ScheduleItem['item_type']) => {
    if (t === 'ride') return C.cyan;
    if (t === 'package_delivery') return C.gold;
    return C.green;
  };

  const visiblePast = showAllPast ? past : past.slice(0, 5);

  return (
    <PageShell>
      <SectionCard
        title={ar ? 'الجدولة' : 'Schedule'}
        subtitle={ar ? 'خطط رحلاتك وتوصيلاتك مسبقاً' : 'Plan trips and pickups in advance'}
        action={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={() => void loadItems()}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '10px 14px', borderRadius: R.md,
                background: C.elevated, border: `1px solid ${C.border}`,
                color: C.text, cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} />
            </button>
            <button
              onClick={() => setShowForm(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', borderRadius: R.md,
                background: C.cyan, border: 'none',
                color: C.bg, fontWeight: TYPE.weight.bold,
                fontFamily: F, fontSize: TYPE.size.sm, cursor: 'pointer',
                boxShadow: `0 10px 24px ${C.cyan}24`,
              }}
            >
              <Plus size={16} />
              {ar ? 'جدولة جديدة' : 'New schedule'}
            </button>
          </div>
        }
      >
        <div style={{ height: 4 }} />
      </SectionCard>

      {/* ── New schedule form ── */}
      {showForm && (
        <SectionCard
          title={ar ? 'عنصر جدول جديد' : 'New scheduled item'}
          action={
            <button
              onClick={() => { setShowForm(false); setLocationCaptured(false); setForm({ ...EMPTY_FORM, user_id: user?.id }); }}
              style={{ background: 'transparent', border: 'none', color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <X size={18} />
            </button>
          }
        >
          <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>

            {/* Type */}
            <div>
              <label style={labelStyle}>{ar ? 'النوع' : 'Type'}</label>
              <select
                value={form.item_type}
                onChange={e => setForm({ ...form, item_type: e.target.value as ScheduleItem['item_type'] })}
                style={inputStyle}
              >
                <option value="ride">{ar ? 'رحلة (ركوب)' : 'Ride'}</option>
                <option value="package_delivery">{ar ? 'توصيل طرد' : 'Package delivery'}</option>
                <option value="package_return">{ar ? 'إرجاع طرد' : 'Package return'}</option>
              </select>
            </div>

            {/* Pickup location */}
            <div>
              <label style={labelStyle}>{ar ? 'موقع الاستلام' : 'Pickup location'}</label>
              <input
                value={form.pickup_location}
                onChange={e => setForm({ ...form, pickup_location: e.target.value })}
                placeholder={ar ? 'أدخل موقع الاستلام' : 'Enter pickup location'}
                style={inputStyle}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => void handleGeolocate()}
                  disabled={locating}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', borderRadius: R.sm,
                    background: C.elevated, border: `1px solid ${C.border}`,
                    color: locating ? C.textMuted : C.cyan,
                    cursor: locating ? 'not-allowed' : 'pointer',
                    fontFamily: F, fontSize: TYPE.size.xs,
                  }}
                >
                  <Navigation2 size={12} />
                  {locating
                    ? (ar ? 'جارٍ التحديد...' : 'Locating...')
                    : (ar ? 'استخدام موقعي الحالي' : 'Use my location')}
                </button>
                {locationCaptured && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '4px 10px', borderRadius: R.full,
                    background: `${C.green}14`, border: `1px solid ${C.green}28`,
                    color: C.green, fontSize: TYPE.size.xs, fontWeight: TYPE.weight.bold,
                  }}>
                    <CheckCircle size={11} />
                    {ar ? 'تم تحديد الموقع' : 'Location captured'}
                  </span>
                )}
              </div>
            </div>

            {/* Dropoff */}
            <div>
              <label style={labelStyle}>{ar ? 'الوجهة' : 'Dropoff location'}</label>
              <input
                value={form.dropoff_location}
                onChange={e => setForm({ ...form, dropoff_location: e.target.value })}
                placeholder={ar ? 'أدخل موقع الوصول (اختياري)' : 'Enter dropoff location (optional)'}
                style={inputStyle}
              />
            </div>

            {/* Date & time */}
            <div>
              <label style={labelStyle}>{ar ? 'التاريخ والوقت' : 'Date & time'}</label>
              <input
                type="datetime-local"
                value={form.scheduled_at}
                onChange={e => setForm({ ...form, scheduled_at: e.target.value })}
                style={inputStyle}
              />
            </div>

            {/* Recurrence */}
            <div>
              <label style={labelStyle}>{ar ? 'التكرار' : 'Recurrence'}</label>
              <select
                value={form.recurring_pattern}
                onChange={e => setForm({ ...form, recurring_pattern: e.target.value })}
                style={inputStyle}
              >
                <option value="none">{ar ? 'مرة واحدة' : 'One-time'}</option>
                <option value="daily">{ar ? 'يومياً' : 'Daily'}</option>
                <option value="weekly">{ar ? 'أسبوعياً' : 'Weekly'}</option>
                <option value="biweekly">{ar ? 'كل أسبوعين' : 'Bi-weekly'}</option>
                <option value="monthly">{ar ? 'شهرياً' : 'Monthly'}</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label style={labelStyle}>{ar ? 'ملاحظات' : 'Notes'}</label>
              <textarea
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder={ar ? 'ملاحظات إضافية (اختياري)' : 'Additional notes (optional)'}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            <button
              onClick={() => void handleCreate()}
              disabled={!form.pickup_location || !form.scheduled_at}
              style={{
                padding: '12px', borderRadius: R.md,
                background: C.cyan, border: 'none',
                color: C.bg, fontWeight: TYPE.weight.ultra,
                fontFamily: F, fontSize: TYPE.size.base,
                cursor: !form.pickup_location || !form.scheduled_at ? 'not-allowed' : 'pointer',
                opacity: !form.pickup_location || !form.scheduled_at ? 0.5 : 1,
                boxShadow: `0 10px 24px ${C.cyan}24`,
              }}
            >
              {ar ? 'تأكيد الجدولة' : 'Confirm schedule'}
            </button>
          </div>
        </SectionCard>
      )}

      {/* ── Upcoming ── */}
      {loading && upcoming.length === 0 ? (
        <SectionCard title={ar ? 'الجدولة' : 'Scheduling'} subtitle={ar ? 'جاري تحميل جدولك' : 'Loading your schedule'}>
          <div style={{ textAlign: 'center', padding: '40px 20px', color: C.textMuted }}>
            <Calendar size={32} color={C.textDim} />
            <div style={{ marginTop: 12, fontFamily: F, fontSize: TYPE.size.base }}>
              {ar ? 'جاري التحميل...' : 'Loading...'}
            </div>
          </div>
        </SectionCard>
      ) : upcoming.length > 0 ? (
        <SectionCard title={ar ? 'قادمة' : 'Upcoming'} contentPadding="0">
          <div style={{ display: 'grid', gap: 0 }}>
            {upcoming.map(item => {
              const typeCol = typeColor(item.item_type);
              const statusEntry = STATUS_LABEL[item.status];
              const statusLabel = statusEntry ? (ar ? statusEntry.ar : statusEntry.en) : item.status;
              const statusColor = statusEntry?.color ?? C.cyan;
              const isCancelling = cancellingId === item.id;

              return (
                <div key={item.id}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 16px',
                    borderBottom: isCancelling ? 'none' : `1px solid ${C.borderFaint}`,
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 14,
                      background: `${typeCol}14`, border: `1px solid ${typeCol}26`,
                      display: 'grid', placeItems: 'center',
                      color: typeCol, flexShrink: 0,
                    }}>
                      {item.item_type === 'ride' ? <Car size={20} /> : <Package size={20} />}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontWeight: TYPE.weight.bold, color: C.text, fontFamily: F, fontSize: TYPE.size.base }}>
                          {typeLabel(item.item_type)}
                        </span>
                        <span style={{
                          padding: '3px 10px', borderRadius: 99,
                          background: `${statusColor}14`, border: `1px solid ${statusColor}30`,
                          color: statusColor, fontSize: TYPE.size.xs, fontWeight: TYPE.weight.bold,
                        }}>
                          {statusLabel}
                        </span>
                      </div>
                      <div style={{
                        color: C.textMuted, fontSize: TYPE.size.sm, marginTop: 2,
                        display: 'flex', alignItems: 'center', gap: 4,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        <MapPin size={12} />
                        {item.pickup_location}
                        {item.dropoff_location && (
                          <>
                            <ArrowRight size={12} style={{ transform: ar ? 'rotate(180deg)' : 'none' }} />
                            {item.dropoff_location}
                          </>
                        )}
                      </div>
                      <div style={{ color: C.textDim, fontSize: TYPE.size.xs, marginTop: 4, display: 'flex', gap: 10, alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Calendar size={10} />
                          {new Date(item.scheduled_at).toLocaleDateString()}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={10} />
                          {new Date(item.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Inline cancel trigger — no prompt() */}
                    <button
                      onClick={() => setCancellingId(isCancelling ? null : item.id)}
                      style={{
                        background: 'transparent',
                        border: `1px solid ${isCancelling ? C.error : `${C.error}40`}`,
                        borderRadius: R.sm, color: C.error,
                        cursor: 'pointer', padding: '8px',
                        display: 'flex', alignItems: 'center',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Inline cancel confirmation row */}
                  {isCancelling && (
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 16px',
                      background: `${C.error}0a`,
                      borderBottom: `1px solid ${C.borderFaint}`,
                      gap: 12,
                    }}>
                      <span style={{ color: C.textMuted, fontSize: TYPE.size.sm }}>
                        {ar ? 'تأكيد إلغاء هذا العنصر؟' : 'Cancel this scheduled item?'}
                      </span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => void handleCancel(item.id)}
                          style={{
                            padding: '6px 14px', borderRadius: R.sm,
                            background: C.error, border: 'none',
                            color: '#fff', fontWeight: TYPE.weight.bold,
                            fontSize: TYPE.size.xs, cursor: 'pointer',
                          }}
                        >
                          {ar ? 'نعم، إلغاء' : 'Yes, cancel'}
                        </button>
                        <button
                          onClick={() => setCancellingId(null)}
                          style={{
                            padding: '6px 14px', borderRadius: R.sm,
                            background: C.elevated, border: `1px solid ${C.border}`,
                            color: C.text, fontWeight: TYPE.weight.bold,
                            fontSize: TYPE.size.xs, cursor: 'pointer',
                          }}
                        >
                          {ar ? 'لا' : 'Keep'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SectionCard>
      ) : !loading ? (
        <SectionCard title={ar ? 'الجدولة' : 'Scheduling'} subtitle={ar ? 'لا توجد عناصر مجدولة بعد' : 'No scheduled items yet'}>
          <div style={{ textAlign: 'center', padding: '40px 20px', color: C.textMuted }}>
            <Calendar size={32} color={C.textDim} />
            <div style={{ marginTop: 12, fontFamily: F, fontSize: TYPE.size.base }}>
              {ar ? 'لا توجد رحلات أو توصيلات مجدولة.' : 'No scheduled rides or deliveries.'}
            </div>
          </div>
        </SectionCard>
      ) : null}

      {/* ── Past ── */}
      {past.length > 0 && (
        <SectionCard title={ar ? 'سابقة' : 'Past'} contentPadding="0">
          <div style={{ display: 'grid', gap: 0 }}>
            {visiblePast.map(item => {
              const typeCol = typeColor(item.item_type);
              const statusEntry = STATUS_LABEL[item.status];
              const statusColor = statusEntry?.color ?? C.textDim;
              return (
                <div key={item.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 16px',
                  borderBottom: `1px solid ${C.borderFaint}`,
                  opacity: 0.7,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 12,
                    background: `${typeCol}10`,
                    display: 'grid', placeItems: 'center',
                    color: C.textDim, flexShrink: 0,
                  }}>
                    {item.item_type === 'ride' ? <Car size={16} /> : <Package size={16} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: TYPE.weight.bold, color: C.textSub, fontFamily: F, fontSize: TYPE.size.sm }}>
                      {typeLabel(item.item_type)} — {item.pickup_location}
                    </div>
                    <div style={{ color: C.textDim, fontSize: TYPE.size.xs, marginTop: 2, display: 'flex', gap: 8, alignItems: 'center' }}>
                      {new Date(item.scheduled_at).toLocaleString()}
                      <span style={{
                        padding: '2px 8px', borderRadius: 99,
                        background: `${statusColor}14`, border: `1px solid ${statusColor}28`,
                        color: statusColor, fontSize: TYPE.size.xs, fontWeight: TYPE.weight.bold,
                      }}>
                        {statusEntry ? (ar ? statusEntry.ar : statusEntry.en) : item.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {past.length > 5 && (
            <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.borderFaint}` }}>
              <button
                onClick={() => setShowAllPast(v => !v)}
                style={{
                  background: 'transparent', border: 'none',
                  color: C.cyan, fontSize: TYPE.size.sm,
                  fontWeight: TYPE.weight.bold, cursor: 'pointer',
                  fontFamily: F,
                }}
              >
                {showAllPast
                  ? (ar ? 'عرض أقل' : 'Show less')
                  : (ar ? `عرض الكل (${past.length})` : `Show all (${past.length})`)}
              </button>
            </div>
          )}
        </SectionCard>
      )}
    </PageShell>
  );
}

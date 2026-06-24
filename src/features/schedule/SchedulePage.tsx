import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, MapPin, Navigation2, Plus, Trash2, X, ArrowRight, Car, Package, RefreshCw } from 'lucide-react';
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

export function SchedulePage() {
  const { user } = useLocalAuth();
  const { language } = useLanguage();
  const ar = language === 'ar';

  const [showForm, setShowForm] = useState(false);
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
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
      // table may not exist yet or network issue; fall back to local
    }

    const stored = localStorage.getItem(LOCAL_KEY);
    if (stored) {
      try {
        setItems(JSON.parse(stored));
      } catch {
        // ignore
      }
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
      } catch {
        // fall back to local
      }
    }

    localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
  };

  const [form, setForm] = useState<ScheduleItem>({
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
  });

  const handleGeolocate = async () => {
    setLocating(true);
    try {
      const pos = await getCurrentPosition();
      setForm(f => ({
        ...f,
        pickup_lat: pos.coords.latitude,
        pickup_lng: pos.coords.longitude,
      }));
    } catch {
      // location unavailable; leave coordinates empty so user can enter manually
    }
    setLocating(false);
  };

  const handleCreate = async () => {
    if (!form.pickup_location || !form.scheduled_at) return;

    const newItem: ScheduleItem = {
      id: crypto.randomUUID(),
      item_type: form.item_type,
      status: 'scheduled',
      pickup_location: form.pickup_location,
      pickup_lat: form.pickup_lat ?? 0,
      pickup_lng: form.pickup_lng ?? 0,
      dropoff_location: form.dropoff_location || undefined,
      dropoff_lat: form.dropoff_lat,
      dropoff_lng: form.dropoff_lng,
      scheduled_at: form.scheduled_at,
      recurring_pattern: form.recurring_pattern,
      notes: form.notes || undefined,
      user_id: user?.id,
      contact_name: form.contact_name || undefined,
      contact_phone: form.contact_phone || undefined,
      estimated_price: form.estimated_price,
    };

    await persist([newItem, ...items]);
    setShowForm(false);
    setForm({
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
      user_id: user?.id,
      contact_name: '',
      contact_phone: '',
      estimated_price: undefined,
    });
  };

  const handleCancel = async (id: string) => {
    await persist(
      items.map(i => (i.id === id ? { ...i, status: 'cancelled' } : i)),
    );
  };

  const handleUpdate = async (id: string, updates: Partial<ScheduleItem>) => {
    await persist(
      items.map(i => (i.id === id ? { ...i, ...updates } : i)),
    );
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
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 14px',
                borderRadius: R.md,
                background: C.elevated,
                border: `1px solid ${C.border}`,
                color: C.text,
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} />
            </button>
            <button
              onClick={() => setShowForm(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: R.md,
                background: C.cyan,
                border: 'none',
                color: C.bg,
                fontWeight: TYPE.weight.bold,
                fontFamily: F,
                fontSize: TYPE.size.sm,
                cursor: 'pointer',
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

      {error && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: R.md,
            background: `${C.error}14`,
            border: `1px solid ${C.error}30`,
            color: C.error,
            fontSize: TYPE.size.sm,
            fontFamily: F,
          }}
        >
          {error}
        </div>
      )}

      {showForm && (
        <SectionCard
          title={ar ? 'عنصر جدول جديد' : 'New scheduled item'}
          action={
            <button
              onClick={() => setShowForm(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: C.textMuted,
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
            <div>
              <label
                style={{
                  color: C.textMuted,
                  fontSize: TYPE.size.xs,
                  fontWeight: TYPE.weight.bold,
                  textTransform: 'uppercase',
                  letterSpacing: TYPE.letterSpacing.wider,
                  marginBottom: 6,
                  display: 'block',
                  fontFamily: F,
                }}
              >
                {ar ? 'النوع' : 'Type'}
              </label>
              <select
                value={form.item_type}
                onChange={e =>
                  setForm({
                    ...form,
                    item_type: e.target.value as ScheduleItem['item_type'],
                  })
                }
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: R.sm,
                  background: C.elevated,
                  border: `1px solid ${C.border}`,
                  color: C.text,
                  fontFamily: F,
                  fontSize: TYPE.size.base,
                }}
              >
                <option value="ride">{ar ? 'رحلة (ركوب)' : 'Ride'}</option>
                <option value="package_delivery">{ar ? 'توصيل طرد' : 'Package delivery'}</option>
                <option value="package_return">{ar ? 'إرجاع طرد' : 'Package return'}</option>
              </select>
            </div>

            <div>
              <label
                style={{
                  color: C.textMuted,
                  fontSize: TYPE.size.xs,
                  fontWeight: TYPE.weight.bold,
                  textTransform: 'uppercase',
                  letterSpacing: TYPE.letterSpacing.wider,
                  marginBottom: 6,
                  display: 'block',
                  fontFamily: F,
                }}
              >
                {ar ? 'موقع الاستلام' : 'Pickup location'}
              </label>
              <input
                value={form.pickup_location}
                onChange={e => setForm({ ...form, pickup_location: e.target.value })}
                placeholder={ar ? 'أدخل موقع الاستلام' : 'Enter pickup location'}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: R.sm,
                  background: C.elevated,
                  border: `1px solid ${C.border}`,
                  color: C.text,
                  fontFamily: F,
                  fontSize: TYPE.size.base,
                }}
              />
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 8,
                  marginTop: 8,
                }}
              >
                <input
                  type="number"
                  step="any"
                  value={form.pickup_lat ?? ''}
                  onChange={e => setForm({ ...form, pickup_lat: parseFloat(e.target.value) || undefined })}
                  placeholder={ar ? 'خط العرض' : 'Latitude'}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: R.sm,
                    background: C.elevated,
                    border: `1px solid ${C.border}`,
                    color: C.text,
                    fontFamily: F,
                    fontSize: TYPE.size.sm,
                  }}
                />
                <input
                  type="number"
                  step="any"
                  value={form.pickup_lng ?? ''}
                  onChange={e => setForm({ ...form, pickup_lng: parseFloat(e.target.value) || undefined })}
                  placeholder={ar ? 'خط الطول' : 'Longitude'}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: R.sm,
                    background: C.elevated,
                    border: `1px solid ${C.border}`,
                    color: C.text,
                    fontFamily: F,
                    fontSize: TYPE.size.sm,
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => void handleGeolocate()}
                disabled={locating}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 6,
                  padding: '6px 12px',
                  borderRadius: R.sm,
                  background: C.elevated,
                  border: `1px solid ${C.border}`,
                  color: locating ? C.textMuted : C.cyan,
                  cursor: locating ? 'not-allowed' : 'pointer',
                  fontFamily: F,
                  fontSize: TYPE.size.xs,
                }}
              >
                <Navigation2 size={12} />
                {locating ? (ar ? 'جارٍ التحديد...' : 'Locating...') : (ar ? 'استخدام موقعي الحالي' : 'Use my location')}
              </button>
            </div>

            <div>
              <label
                style={{
                  color: C.textMuted,
                  fontSize: TYPE.size.xs,
                  fontWeight: TYPE.weight.bold,
                  textTransform: 'uppercase',
                  letterSpacing: TYPE.letterSpacing.wider,
                  marginBottom: 6,
                  display: 'block',
                  fontFamily: F,
                }}
              >
                {ar ? 'الوجهة' : 'Dropoff location'}
              </label>
              <input
                value={form.dropoff_location}
                onChange={e => setForm({ ...form, dropoff_location: e.target.value })}
                placeholder={ar ? 'أدخل موقع الوصول (اختياري)' : 'Enter dropoff location (optional)'}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: R.sm,
                  background: C.elevated,
                  border: `1px solid ${C.border}`,
                  color: C.text,
                  fontFamily: F,
                  fontSize: TYPE.size.base,
                }}
              />
            </div>

            <div>
              <label
                style={{
                  color: C.textMuted,
                  fontSize: TYPE.size.xs,
                  fontWeight: TYPE.weight.bold,
                  textTransform: 'uppercase',
                  letterSpacing: TYPE.letterSpacing.wider,
                  marginBottom: 6,
                  display: 'block',
                  fontFamily: F,
                }}
              >
                {ar ? 'التاريخ والوقت' : 'Date & time'}
              </label>
              <input
                type="datetime-local"
                value={form.scheduled_at}
                onChange={e => setForm({ ...form, scheduled_at: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: R.sm,
                  background: C.elevated,
                  border: `1px solid ${C.border}`,
                  color: C.text,
                  fontFamily: F,
                  fontSize: TYPE.size.base,
                }}
              />
            </div>

            <div>
              <label
                style={{
                  color: C.textMuted,
                  fontSize: TYPE.size.xs,
                  fontWeight: TYPE.weight.bold,
                  textTransform: 'uppercase',
                  letterSpacing: TYPE.letterSpacing.wider,
                  marginBottom: 6,
                  display: 'block',
                  fontFamily: F,
                }}
              >
                {ar ? 'التكرار' : 'Recurrence'}
              </label>
              <select
                value={form.recurring_pattern}
                onChange={e => setForm({ ...form, recurring_pattern: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: R.sm,
                  background: C.elevated,
                  border: `1px solid ${C.border}`,
                  color: C.text,
                  fontFamily: F,
                  fontSize: TYPE.size.base,
                }}
              >
                <option value="none">{ar ? 'مرة واحدة' : 'One-time'}</option>
                <option value="daily">{ar ? 'يومياً' : 'Daily'}</option>
                <option value="weekly">{ar ? 'أسبوعياً' : 'Weekly'}</option>
                <option value="biweekly">{ar ? 'كل أسبوعين' : 'Bi-weekly'}</option>
                <option value="monthly">{ar ? 'شهرياً' : 'Monthly'}</option>
              </select>
            </div>

            <div>
              <label
                style={{
                  color: C.textMuted,
                  fontSize: TYPE.size.xs,
                  fontWeight: TYPE.weight.bold,
                  textTransform: 'uppercase',
                  letterSpacing: TYPE.letterSpacing.wider,
                  marginBottom: 6,
                  display: 'block',
                  fontFamily: F,
                }}
              >
                {ar ? 'ملاحظات' : 'Notes'}
              </label>
              <textarea
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder={ar ? 'ملاحظات إضافية (اختياري)' : 'Additional notes (optional)'}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: R.sm,
                  background: C.elevated,
                  border: `1px solid ${C.border}`,
                  color: C.text,
                  fontFamily: F,
                  fontSize: TYPE.size.base,
                  resize: 'vertical' as const,
                }}
              />
            </div>

            <button
              onClick={handleCreate}
              disabled={!form.pickup_location || !form.scheduled_at}
              style={{
                padding: '12px',
                borderRadius: R.md,
                background: C.cyan,
                border: 'none',
                color: C.bg,
                fontWeight: TYPE.weight.ultra,
                fontFamily: F,
                fontSize: TYPE.size.base,
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

      {loading && upcoming.length === 0 ? (
        <SectionCard
          title={ar ? 'الجدولة' : 'Scheduling'}
          subtitle={ar ? 'جاري تحميل جدولك' : 'Loading your schedule'}
        >
          <div
            style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: C.textMuted,
            }}
          >
            <Calendar size={32} color={C.textDim} />
            <div style={{ marginTop: 12, fontFamily: F, fontSize: TYPE.size.base }}>
              {ar ? 'جاري التحميل...' : 'Loading...'}
            </div>
          </div>
        </SectionCard>
      ) : upcoming.length > 0 ? (
        <SectionCard
          title={ar ? 'قادمة' : 'Upcoming'}
          contentPadding="0"
        >
          <div style={{ display: 'grid', gap: 0 }}>
            {upcoming.map(item => {
              const typeCol = typeColor(item.item_type);
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 16px',
                    borderBottom: `1px solid ${C.borderFaint}`,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      background: `${typeCol}14`,
                      border: `1px solid ${typeCol}26`,
                      display: 'grid',
                      placeItems: 'center',
                      color: typeCol,
                      flexShrink: 0,
                    }}
                  >
                    {item.item_type === 'ride' ? (
                      <Car size={20} />
                    ) : (
                      <Package size={20} />
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          fontWeight: TYPE.weight.bold,
                          color: C.text,
                          fontFamily: F,
                          fontSize: TYPE.size.base,
                        }}
                      >
                        {typeLabel(item.item_type)}
                      </span>
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: 99,
                          background: `${C.cyan}14`,
                          border: `1px solid ${C.cyan}30`,
                          color: C.cyan,
                          fontSize: TYPE.size.xs,
                          fontWeight: TYPE.weight.bold,
                        }}
                      >
                        {item.status}
                      </span>
                    </div>
                    <div
                      style={{
                        color: C.textMuted,
                        fontSize: TYPE.size.sm,
                        marginTop: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <MapPin size={12} />
                      {item.pickup_location}
                      {item.dropoff_location && (
                        <>
                          <ArrowRight
                            size={12}
                            style={{ transform: ar ? 'rotate(180deg)' : 'none' }}
                          />
                          {item.dropoff_location}
                        </>
                      )}
                    </div>
                    <div
                      style={{
                        color: C.textDim,
                        fontSize: TYPE.size.xs,
                        marginTop: 4,
                        display: 'flex',
                        gap: 10,
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={10} />
                        {new Date(item.scheduled_at).toLocaleDateString()}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={10} />
                        {new Date(item.scheduled_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {item.pickup_lat !== undefined && item.pickup_lng !== undefined && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Navigation2 size={10} />
                          {item.pickup_lat.toFixed(4)}, {item.pickup_lng.toFixed(4)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => {
                        const r = prompt(ar ? 'تأكيد الإلغاء؟' : 'Confirm cancellation?');
                        if (r === null) return;
                        void handleCancel(item.id);
                      }}
                      style={{
                        background: 'transparent',
                        border: `1px solid ${C.error}40`,
                        borderRadius: R.sm,
                        color: C.error,
                        cursor: 'pointer',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                    <button
                      onClick={() => void handleUpdate(item.id, { status: 'confirmed' })}
                      style={{
                        background: `${C.green}14`,
                        border: `1px solid ${C.green}30`,
                        borderRadius: R.sm,
                        color: C.green,
                        cursor: 'pointer',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: TYPE.size.xs,
                        fontWeight: TYPE.weight.bold,
                      }}
                    >
                      {ar ? 'تأكيد' : 'Confirm'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      ) : !loading ? (
        <SectionCard
          title={ar ? 'الجدولة' : 'Scheduling'}
          subtitle={ar ? 'لا توجد عناصر مجدولة بعد' : 'No scheduled items yet'}
        >
          <div
            style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: C.textMuted,
            }}
          >
            <Calendar size={32} color={C.textDim} />
            <div style={{ marginTop: 12, fontFamily: F, fontSize: TYPE.size.base }}>
              {ar ? 'لا توجد رحلات أو توصيلات مجدولة.' : 'No scheduled rides or deliveries.'}
            </div>
          </div>
        </SectionCard>
      ) : null}

      {past.length > 0 && (
        <SectionCard
          title={ar ? 'سابقة' : 'Past'}
          contentPadding="0"
        >
          <div style={{ display: 'grid', gap: 0 }}>
            {past.slice(0, 10).map(item => {
              const typeCol = typeColor(item.item_type);
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '12px 16px',
                    borderBottom: `1px solid ${C.borderFaint}`,
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
                      color: C.textDim,
                      flexShrink: 0,
                    }}
                  >
                    {item.item_type === 'ride' ? <Car size={16} /> : <Package size={16} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: TYPE.weight.bold,
                        color: C.textSub,
                        fontFamily: F,
                        fontSize: TYPE.size.sm,
                      }}
                    >
                      {typeLabel(item.item_type)} - {item.pickup_location}
                    </div>
                    <div
                      style={{
                        color: C.textDim,
                        fontSize: TYPE.size.xs,
                        marginTop: 2,
                      }}
                    >
                      {new Date(item.scheduled_at).toLocaleString()} · {item.status}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}
    </PageShell>
  );
}
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, MapPin, Plus, Trash2, X, ArrowRight, Car, Package } from 'lucide-react';
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
  dropoff_location?: string;
  scheduled_at: string;
  recurring_pattern: string;
  notes?: string;
  user_id?: string;
};

const LOCAL_KEY = 'wasel-scheduled-items-v1';

export function SchedulePage() {
  const { user } = useLocalAuth();
  const { language } = useLanguage();
  const ar = language === 'ar';

  const [showForm, setShowForm] = useState(false);
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadItems = async () => {
    setLoading(true);
    try {
      if (supabase && user?.id) {
        const { data, error } = await supabase
          .from('scheduled_pickups')
          .select('*')
          .eq('user_id', user.id)
          .order('scheduled_at', { ascending: true });

        if (error) throw error;
        if (data && data.length > 0) {
          setItems(data as ScheduleItem[]);
          localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
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
  };

  useEffect(() => {
    void loadItems();
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
          dropoff_location: item.dropoff_location ?? null,
          scheduled_at: item.scheduled_at,
          recurring_pattern: item.recurring_pattern,
          notes: item.notes ?? null,
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

  const [form, setForm] = useState({
    item_type: 'ride' as ScheduleItem['item_type'],
    pickup_location: '',
    dropoff_location: '',
    scheduled_at: '',
    recurring_pattern: 'none',
    notes: '',
  });

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

  const handleCreate = async () => {
    if (!form.pickup_location || !form.scheduled_at) return;

    const newItem: ScheduleItem = {
      id: crypto.randomUUID(),
      item_type: form.item_type,
      status: 'scheduled',
      pickup_location: form.pickup_location,
      dropoff_location: form.dropoff_location,
      scheduled_at: form.scheduled_at,
      recurring_pattern: form.recurring_pattern,
      notes: form.notes,
      user_id: user?.id,
    };

    await persist([newItem, ...items]);
    setShowForm(false);
    setForm({
      item_type: 'ride',
      pickup_location: '',
      dropoff_location: '',
      scheduled_at: '',
      recurring_pattern: 'none',
      notes: '',
    });
  };

  const handleCancel = async (id: string) => {
    await persist(
      items.map(i => (i.id === id ? { ...i, status: 'cancelled' } : i)),
    );
  };

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
        }
      >
        <div style={{ height: 4 }} />
      </SectionCard>

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
                {ar ? 'من' : 'Pickup location'}
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
                {ar ? 'إلى' : 'Dropoff location'}
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
                cursor:
                  !form.pickup_location || !form.scheduled_at ? 'not-allowed' : 'pointer',
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
        <SectionCard>
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
                    </div>
                  </div>

                  <button
                    onClick={() => handleCancel(item.id)}
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
                </div>
              );
            })}
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

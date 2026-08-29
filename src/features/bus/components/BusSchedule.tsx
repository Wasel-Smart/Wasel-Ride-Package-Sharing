import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import type { BusRoute } from '../../../services/bus';
import { C } from '../../../utils/wasel-ds';
import { DS, r, pill } from '../../shared/pageShared';
import { tx } from '../../../locales/tx';

function getScheduleTimes(route: BusRoute) {
  return route.departureTimes?.length ? route.departureTimes : [route.dep];
}

export function BusSchedule({
  busRoutes,
  origin,
  destination,
  onSelect,
  onBookingComplete,
}: {
  busRoutes: BusRoute[];
  origin: string;
  destination: string;
  onSelect: (id: string) => void;
  onBookingComplete: () => void;
}) {
  const exactRoutes = useMemo(
    () => busRoutes.filter(r => r.from === origin && r.to === destination),
    [busRoutes, origin, destination],
  );

  const fallbackBuses = useMemo(() => {
    const exactIds = new Set(exactRoutes.map(r => r.id));
    return busRoutes.filter(r => !exactIds.has(r.id) && r.seats > 0).slice(0, 3);
  }, [busRoutes, exactRoutes]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div
        style={{
          background: DS.card,
          border: `1px solid ${DS.border}`,
          borderRadius: r(22),
          padding: '18px 18px 16px',
        }}
      >
        <div style={{ color: C.text, fontWeight: 800, marginBottom: 8 }}>
          {tx('busPage.corridor_snapshot')}
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          {busRoutes.slice(0, 6).map(route => {
            const times = getScheduleTimes(route);
            return (
              <div
                key={`${route.id}-snapshot`}
                className="sp-corridor-snapshot"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0,1.2fr) auto auto',
                  gap: 10,
                  alignItems: 'center',
                  background: DS.card2,
                  border: `1px solid ${DS.border}`,
                  borderRadius: r(14),
                  padding: '12px 14px',
                }}
              >
                <div>
                  <div style={{ color: C.text, fontWeight: 700, fontSize: '0.84rem' }}>
                    {route.from} {tx('busPage.to_7')}
                    {route.to}
                  </div>
                  <div style={{ color: DS.sub, fontSize: '0.74rem', marginTop: 4 }}>
                    {route.company} - {times[0]} {tx('busPage.first')}
                    {times[times.length - 1]} {tx('busPage.last')}
                  </div>
                </div>
                <div
                  style={{
                    color: route.color ?? DS.cyan,
                    fontWeight: 800,
                    fontSize: '0.84rem',
                  }}
                >
                  {route.price} JOD
                </div>
                <span
                  style={{
                    ...pill(route.dataSource === 'official' ? DS.cyan : DS.green),
                    fontSize: '0.64rem',
                  }}
                >
                  {route.dataSource === 'official' ? 'رسمي' : 'مباشر'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          background: DS.card,
          border: `1px solid ${DS.border}`,
          borderRadius: r(22),
          padding: '18px 18px 16px',
        }}
      >
        <div style={{ color: C.text, fontWeight: 800, marginBottom: 8 }}>
          {tx('busPage.what_to_know_before_you_go')}
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          {[
            'خطوط الأردن تستخدم الآن مواعيد وأسعار وأيام تشغيل رسمية من المزودين بدل قائمة تجريبية فقط.',
            'وقت المغادرة قابل للاختيار، والصفحة تعرض حالة اليوم مثل الصعود قريباً أو مغلق اليوم.',
            'إذا ما توفر مخزون مباشر، واصل يرجع للجدول الرسمي الموثق بدل إخفاء الخط.',
          ].map(item => (
            <div
              key={item}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                color: DS.sub,
                fontSize: '0.8rem',
                lineHeight: 1.5,
              }}
            >
              <Shield size={15} color={DS.green} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {fallbackBuses.length > 0 && (
        <div
          style={{
            background: DS.card,
            border: `1px solid ${DS.border}`,
            borderRadius: r(22),
            padding: '18px 18px 16px',
          }}
        >
          <div style={{ color: C.text, fontWeight: 800, marginBottom: 12 }}>
            {tx('busPage.if_this_coach_fills_up')}
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {fallbackBuses.map(route => (
              <motion.button
                key={route.id}
                type="button"
                onClick={() => {
                  onSelect(String(route.id));
                  onBookingComplete();
                }}
                style={{
                  textAlign: 'left',
                  borderRadius: r(14),
                  border: `1px solid ${route.color ?? DS.cyan}24`,
                  background: C.elevated,
                  padding: '12px 14px',
                  cursor: 'pointer',
                  display: 'grid',
                  gap: 6,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 10,
                    alignItems: 'center',
                  }}
                >
                  <span style={{ color: C.text, fontWeight: 800, fontSize: '0.84rem' }}>
                    {route.company}
                  </span>
                  <span style={{ ...pill(route.color ?? DS.cyan), fontSize: '0.64rem' }}>
                    {route.dep}
                  </span>
                </div>
                <div style={{ color: DS.sub, fontSize: '0.78rem' }}>
                  {route.from} {tx('busPage.to_3')}
                  {route.to} | {route.price} JOD | {route.seats} {tx('busPage.seats')}
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

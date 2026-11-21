import { motion, useReducedMotion } from 'framer-motion';
import { MessageSquareQuote, Star } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { C, TYPE } from '../HomePageShared';

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #00E5FF 0%, #32D8A6 100%)',
  'linear-gradient(135deg, #FFBE5C 0%, #FF8A0B 100%)',
  'linear-gradient(135deg, #72C70D 0%, #34D8A7 100%)',
];
const AVATAR_GLOWS = [
  'rgba(0,229,255,0.35)',
  'rgba(255,190,92,0.35)',
  'rgba(114,199,13,0.35)',
];

type TestimonialItem = {
  text: string; name: string; role: string;
  routeAr: string; routeEn: string; stars: number;
};

function TestimonialCard({ item, index, ar }: { item: TestimonialItem; index: number; ar: boolean }) {
  const grad = AVATAR_GRADIENTS[index % 3];
  const glow = AVATAR_GLOWS[index % 3];
  return (
    <div
      className="wasel-home-testimonial"
      style={{
        background: 'var(--card)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        border: `1px solid ${'var(--border)'}`, borderTop: `1px solid ${C.cyanGlow}`,
        boxShadow: '0 1px 0 rgba(255, 255, 255, 0.05) inset, 0 10px 28px rgba(8, 29, 57, 0.35)',
        borderRadius: 18, padding: '22px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div className="wasel-home-testimonial-stars">
          {Array.from({ length: item.stars }).map((_, i) => (
            <Star key={i} size={14} fill={C.brandOrange} color={C.brandOrange} />
          ))}
        </div>
        <div style={{ fontSize: '0.8125rem', fontWeight: 700, padding: '3px 8px', borderRadius: 9999, background: C.cyanDim, border: `1px solid ${C.cyanGlow}`, color: 'var(--primary)' }}>
          {ar ? item.routeAr : item.routeEn}
        </div>
      </div>
      <div className="wasel-home-testimonial-text" style={{ fontSize: '0.94rem', color: 'var(--foreground)', lineHeight: 1.7, marginTop: 10 }}>
        "{ item.text }"
      </div>
      <div className="wasel-home-testimonial-author" style={{ marginTop: 'auto', paddingTop: 14 }}>
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: grad, boxShadow: `0 0 0 2px ${'var(--card)'}, 0 0 0 4px ${glow}, 0 4px 14px ${glow}`, display: 'grid', placeItems: 'center', color: 'var(--background)', fontSize: TYPE.size.base, fontWeight: TYPE.weight.ultra, flexShrink: 0, letterSpacing: '-0.01em' }}>
          {item.name.charAt(0)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="wasel-home-testimonial-name" style={{ fontSize: '0.92rem', fontWeight: 800 }}>{item.name}</span>
          </div>
          <div className="wasel-home-testimonial-role" style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)' }}>{item.role}</div>
        </div>
      </div>
    </div>
  );
}

export function TestimonialsSection() {
  const { language, t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const ar = language === 'ar';
  // These quotes are static copy, not sourced from real riders, and must not be
  // presented as verified. Render only when explicitly enabled (e.g. once the
  // strings are replaced with real, attributable testimonials).
  if (import.meta.env.VITE_SHOW_TESTIMONIALS !== 'true') {
    return null;
  }
  const testimonials: TestimonialItem[] = [
    { text: t('homeSections.testimonial1Text'), name: t('homeSections.testimonial1Name'), role: t('homeSections.testimonial1Role'), routeAr: 'عمّان ⇄ إربد', routeEn: 'Amman ⇄ Irbid', stars: 5 },
    { text: t('homeSections.testimonial2Text'), name: t('homeSections.testimonial2Name'), role: t('homeSections.testimonial2Role'), routeAr: 'عمّان ⇄ العقبة', routeEn: 'Amman ⇄ Aqaba', stars: 5 },
    { text: t('homeSections.testimonial3Text'), name: t('homeSections.testimonial3Name'), role: t('homeSections.testimonial3Role'), routeAr: 'عمّان ⇄ الزرقاء', routeEn: 'Amman ⇄ Zarqa', stars: 5 },
  ];

  return (
    <motion.section
      initial={reduceMotion ? false : 'hidden'}
      whileInView={reduceMotion ? undefined : 'visible'}
      viewport={{ once: true, margin: '-80px' }}
      className="wasel-home-section"
    >
      <div className="wasel-home-section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="wasel-home-section-icon" style={{ color: 'var(--primary)' }}>
            <MessageSquareQuote size={16} />
          </div>
          <div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--primary)' }}>
              {ar ? 'تجارب مستخدمي واصل' : 'Jordanian Community Stories'}
            </div>
            <h2 className="wasel-home-section-title" style={{ marginTop: 2 }}>
              {t('homeSections.testimonialsTitle')}
            </h2>
          </div>
        </div>
      </div>
      <div className="wasel-home-testimonials">
        {testimonials.map((item, index) => (
          <TestimonialCard key={index} item={item} index={index} ar={ar} />
        ))}
      </div>
    </motion.section>
  );
}

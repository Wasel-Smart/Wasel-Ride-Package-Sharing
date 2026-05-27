import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { C, SectionHeader } from '../HomePageShared';
import type { QuickAction } from './types';

interface QuickActionsSectionProps {
  ar: boolean;
  quickActions: QuickAction[];
  onNavigate: (path: string) => void;
}

export function QuickActionsSection({ ar, quickActions, onNavigate }: QuickActionsSectionProps) {
  return (
    <motion.section initial={false} style={{ marginTop: 34 }}>
      <SectionHeader title={ar ? 'اختر ما تريد فعله' : 'Choose what you need'} icon="+" />
      <div
        className="wasel-home-actions"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 14,
        }}
      >
        {quickActions.map(action => {
          const Icon = action.icon;
          return (
            <motion.button
              className="wasel-home-card wasel-home-action-card"
              key={action.path}
              onClick={() => onNavigate(action.path)}
              whileHover={{ y: -1 }}
              style={{
                minHeight: 214,
                textAlign: ar ? 'right' : 'left',
                borderRadius: 18,
                padding: '18px 16px',
                background: 'rgba(255,255,255,0.035)',
                border: `1px solid ${action.border}`,
                cursor: 'pointer',
                boxShadow: '0 12px 28px rgba(0,0,0,0.14)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    display: 'grid',
                    placeItems: 'center',
                    background: action.dim,
                    border: `1px solid ${action.border}`,
                  }}
                >
                  <Icon size={20} color={action.color} aria-hidden="true" />
                </div>
                <div
                  style={{
                    minHeight: 30,
                    padding: '7px 10px',
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: C.textMuted,
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    lineHeight: 1.25,
                  }}
                >
                  {action.kicker}
                </div>
              </div>

              <div style={{ marginTop: 18, fontWeight: 900, fontSize: '1rem', color: C.text }}>
                {action.title}
              </div>
              <div style={{ marginTop: 8, color: C.textMuted, fontSize: '0.84rem', lineHeight: 1.62 }}>
                {action.desc}
              </div>
              <div
                style={{
                  marginTop: 14,
                  paddingTop: 14,
                  borderTop: `1px solid ${C.borderFaint}`,
                  color: C.textSub,
                  fontSize: '0.78rem',
                  lineHeight: 1.5,
                }}
              >
                {action.outcome}
              </div>

              <div
                style={{
                  marginTop: 'auto',
                  paddingTop: 18,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  color: action.color,
                  fontWeight: 800,
                  fontSize: '0.8rem',
                }}
              >
                {ar ? 'ابدأ الآن' : 'Start now'}
                <ArrowRight size={13} style={{ transform: ar ? 'scaleX(-1)' : 'none' }} aria-hidden="true" />
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.section>
  );
}

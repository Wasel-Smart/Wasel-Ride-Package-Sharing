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
      <SectionHeader title={ar ? 'ابدأ من الخدمة المناسبة' : 'Choose the right mode'} icon="+" />
      <div
        className="wasel-home-actions"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 14,
        }}
      >
        {quickActions.map(action => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.path}
              onClick={() => onNavigate(action.path)}
              whileHover={{ y: -2 }}
              style={{
                minHeight: 220,
                textAlign: 'left',
                borderRadius: 26,
                padding: '20px 20px 18px',
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.03))',
                border: `1px solid ${action.border}`,
                cursor: 'pointer',
                boxShadow: '0 16px 34px rgba(0,0,0,0.18)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    display: 'grid',
                    placeItems: 'center',
                    background: action.dim,
                    border: `1px solid ${action.border}`,
                  }}
                >
                  <Icon size={20} color={action.color} />
                </div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    height: 30,
                    padding: '0 10px',
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: C.textMuted,
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: action.color,
                      boxShadow: `0 0 12px ${action.color}55`,
                    }}
                  />
                  {action.kicker}
                </div>
              </div>

              <div
                style={{
                  marginTop: 18,
                  fontWeight: 900,
                  fontSize: '1rem',
                  letterSpacing: '-0.02em',
                  color: C.text,
                }}
              >
                {action.title}
              </div>
              <div
                style={{
                  marginTop: 8,
                  color: C.textMuted,
                  fontSize: '0.82rem',
                  lineHeight: 1.68,
                  maxWidth: 420,
                }}
              >
                {action.desc}
              </div>
              <div
                style={{
                  marginTop: 14,
                  paddingTop: 14,
                  borderTop: `1px solid ${C.borderFaint}`,
                  color: C.textSub,
                  fontSize: '0.76rem',
                  lineHeight: 1.55,
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
                  fontSize: '0.78rem',
                }}
              >
                {ar ? 'افتح هذا المسار' : 'Open this flow'}
                <ArrowRight size={13} style={{ transform: ar ? 'scaleX(-1)' : 'none' }} />
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.section>
  );
}

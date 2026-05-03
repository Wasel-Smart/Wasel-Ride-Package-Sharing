import { motion } from 'motion/react';
import { ChevronRight } from 'lucide-react';
import { SectionHeader } from '../HomePageShared';
import type { QuickAction } from './types';

interface QuickActionsSectionProps {
  ar: boolean;
  quickActions: QuickAction[];
  onNavigate: (path: string) => void;
}

export function QuickActionsSection({
  ar,
  quickActions,
  onNavigate,
}: QuickActionsSectionProps) {
  return (
    <motion.section
      initial={false}
      style={{ marginTop: 30 }}
    >
      <SectionHeader
        title={ar ? 'ابدأ من الخدمة المناسبة' : 'Choose the right mode'}
        icon="+"
      />
      <div
        className="wasel-home-actions"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 12,
        }}
      >
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.path}
              onClick={() => onNavigate(action.path)}
              whileHover={{ y: -3 }}
              style={{
                textAlign: 'left',
                borderRadius: 22,
                padding: '18px 16px 16px',
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.03))',
                border: `1px solid ${action.border}`,
                cursor: 'pointer',
                boxShadow: '0 12px 28px rgba(0,0,0,0.16)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 10,
                  alignItems: 'start',
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    display: 'grid',
                    placeItems: 'center',
                    background: action.dim,
                    border: `1px solid ${action.border}`,
                  }}
                >
                  <Icon size={18} color={action.color} />
                </div>
                <span
                  style={{
                    minWidth: 28,
                    height: 28,
                    borderRadius: 999,
                    display: 'grid',
                    placeItems: 'center',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: action.color,
                    fontSize: '0.68rem',
                    fontWeight: 900,
                  }}
                >
                  {action.badge}
                </span>
              </div>

              <div style={{ marginTop: 14, fontWeight: 900, fontSize: '0.9rem' }}>
                {action.title}
              </div>
              <div
                style={{
                  marginTop: 7,
                  color: 'rgba(148,163,184,0.55)',
                  fontSize: '0.74rem',
                  lineHeight: 1.6,
                }}
              >
                {action.desc}
              </div>
              <div
                style={{
                  marginTop: 14,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  color: action.color,
                  fontWeight: 800,
                  fontSize: '0.75rem',
                }}
              >
                {ar ? 'افتح الخدمة' : 'Open service'}
                <ChevronRight size={12} />
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.section>
  );
}

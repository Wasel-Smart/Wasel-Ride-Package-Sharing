import { motion } from 'framer-motion';
import type { CSSProperties, ReactNode } from 'react';
import { C, TYPE, SPACE, R } from '@/utils/wasel-ds';

interface WaselStatCardProps {
  value: string | number;
  label: string;
  accent: string;
  icon?: ReactNode;
  sublabel?: string;
}

const ANIM_DUR = '160ms';

export function WaselStatCard ({
  value,
  label,
  accent,
  icon,
  sublabel,
}: WaselStatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: ANIM_DUR }}
      style={{
        borderRadius: R.xl,
        border: `1px solid ${accent}24`,
        background: `${accent}12`,
        padding: `${SPACE[3]} ${SPACE[4]}`,
        textAlign: 'left',
        transition: `transform ${ANIM_DUR}, box-shadow ${ANIM_DUR}`,
        boxShadow: 'none',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = `0 8px 24px ${accent}18`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {icon ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACE[2], marginBottom: SPACE[1] }}>
          <span style={{ color: accent, display: 'flex' }}>{icon}</span>
        </div>
      ) : null}
      <div
        style={{
          color: C.text,
          fontSize: TYPE.size.lg,
          fontWeight: TYPE.weight.ultra,
          lineHeight: TYPE.lineHeight.tight,
        }}
      >
        {value}
      </div>
      <div
        style={{
          marginTop: 4,
          color: C.textMuted,
          fontSize: TYPE.size.xs,
          textTransform: 'uppercase',
          letterSpacing: TYPE.letterSpacing.wide,
        }}
      >
        {label}
      </div>
      {sublabel ? (
        <div style={{ marginTop: 2, color: C.textDim, fontSize: TYPE.size.xs }}>
          {sublabel}
        </div>
      ) : null}
    </motion.div>
  );
}

const ANIM_DUR = '160ms';

interface WaselGradientTextProps {
  children: ReactNode;
  accent?: string;
}

export function WaselGradientText ({
  children,
  accent = '#00E5FF',
}: WaselGradientTextProps) {
  return (
    <span
      style={{
        display: 'block',
        background: `linear-gradient(90deg, ${accent}, ${accent}99)`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}
    >
      {children}
    </span>
  );
}

interface WaselAmbientGlowProps {
  position?: 'top-right' | 'bottom-left' | 'top-left' | 'bottom-right';
  color?: string;
  size?: number;
}

export function WaselAmbientGlow ({
  position = 'top-right',
  color = C.cyanGlow,
  size = 460,
}: WaselAmbientGlowProps) {
  const positions: Record<string, CSSProperties> = {
    'top-right': { top: -size / 2, right: -size / 3 },
    'bottom-left': { bottom: -size / 2, left: -size / 3 },
    'top-left': { top: -size / 2, left: -size / 3 },
    'bottom-right': { bottom: -size / 2, right: -size / 3 },
  };

  return (
    <div
      style={{
        position: 'absolute',
        ...positions[position],
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color}, transparent 66%)`,
        filter: 'blur(80px)',
        pointerEvents: 'none',
      }}
    />
  );
}

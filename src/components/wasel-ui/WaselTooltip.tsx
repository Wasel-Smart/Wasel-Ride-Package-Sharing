import { useState, useRef, type ReactNode } from 'react';
import { C, R, TYPE } from '../utils/wasel-ds';

interface TooltipProps {
  children: ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function WaselTooltip({ children, content, position = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const positionStyles = {
    top: { bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' },
    bottom: { top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' },
    left: { right: 'calc(100% + 8px)', top: '50%', transform: 'translateY(-50%)' },
    right: { left: 'calc(100% + 8px)', top: '50%', transform: 'translateY(-50%)' },
  };

  return (
    <div
      ref={ref}
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          style={{
            ...positionStyles[position],
            position: 'absolute',
            padding: '6px 10px',
            background: C.navy,
            border: `1px solid ${C.cyan}30`,
            borderRadius: R.sm,
            fontSize: TYPE.size.xs,
            color: C.text,
            whiteSpace: 'nowrap',
            zIndex: 500,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            pointerEvents: 'none',
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
}

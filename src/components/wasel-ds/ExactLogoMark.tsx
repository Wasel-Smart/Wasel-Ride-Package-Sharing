import { motion } from 'motion/react';
import { C } from '../../utils/wasel-ds';

const ARTBOARD_SIZE = 124;
const CENTER = ARTBOARD_SIZE / 2;
const CORE_SIZE = 72;
const CORE_OFFSET = (ARTBOARD_SIZE - CORE_SIZE) / 2;

const ORBIT_PARTICLES = [
  { angle: 0, radius: 52, size: 5, color: C.cyan, delay: 0, duration: 4 },
  { angle: 72, radius: 58, size: 3, color: C.blue, delay: 0.4, duration: 5 },
  { angle: 144, radius: 50, size: 4, color: C.green, delay: 0.8, duration: 4.5 },
  { angle: 216, radius: 55, size: 3, color: C.blue, delay: 1.2, duration: 3.8 },
  { angle: 288, radius: 52, size: 5, color: C.cyan, delay: 1.6, duration: 5.2 },
] as const;

const SPARKLES = [
  { x: -28, y: -38, delay: 0, size: 3 },
  { x: 30, y: -32, delay: 0.6, size: 2 },
  { x: 40, y: 18, delay: 1.2, size: 3 },
  { x: -36, y: 24, delay: 1.8, size: 2 },
  { x: 8, y: 45, delay: 0.3, size: 2 },
  { x: -10, y: -46, delay: 0.9, size: 3 },
] as const;

function BlueBallNetworkSymbol({ animated }: { animated: boolean }) {
  return (
    <motion.svg
      viewBox="0 0 72 72"
      style={{
        position: 'absolute',
        inset: 6,
        zIndex: 3,
        overflow: 'visible',
      }}
      animate={
        animated
          ? {
              scale: [0.985, 1.015, 0.985],
              opacity: [0.92, 1, 0.92],
            }
          : { scale: 1, opacity: 1 }
      }
      transition={animated ? { duration: 2.8, repeat: Infinity, ease: 'easeInOut' } : undefined}
    >
      <defs>
        <filter id="blue-ball-network-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.9" />
        </filter>
        <radialGradient id="blue-ball-node-fill" cx="50%" cy="42%" r="72%">
          <stop offset="0%" stopColor={C.blueLight} />
          <stop offset="38%" stopColor={C.green} />
          <stop offset="100%" stopColor={C.cyan} />
        </radialGradient>
        <linearGradient id="blue-ball-link-glow" x1="14" y1="50" x2="59" y2="15" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={C.cyan} />
          <stop offset="52%" stopColor={C.green} />
          <stop offset="100%" stopColor={C.blue} />
        </linearGradient>
        <linearGradient id="blue-ball-link-core" x1="16" y1="48" x2="57" y2="17" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={C.blueLight} />
          <stop offset="56%" stopColor={C.green} />
          <stop offset="100%" stopColor="#f4fffe" />
        </linearGradient>
      </defs>

      <g opacity="0.9">
        <path
          d="M17 50L36 31L56 16"
          fill="none"
          stroke={C.navy}
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.56"
        />
        <path
          d="M17 50L36 31L56 16"
          fill="none"
          stroke="url(#blue-ball-link-glow)"
          strokeWidth="5.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#blue-ball-network-glow)"
        />
        <path
          d="M17 50L36 31L56 16"
          fill="none"
          stroke="url(#blue-ball-link-core)"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      <g opacity="0.58">
        <path
          d="M21 45L27 17L36 31"
          fill="none"
          stroke="#5B7182"
          strokeWidth="2.05"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M36 31L48 43"
          fill="none"
          stroke="#5B7182"
          strokeWidth="2.05"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      <g opacity="0.92">
        <circle cx="17" cy="50" r="7.8" fill={C.cyan} opacity="0.38" filter="url(#blue-ball-network-glow)" />
        <circle cx="36" cy="31" r="10.2" fill={C.green} opacity="0.42" filter="url(#blue-ball-network-glow)" />
        <circle cx="56" cy="16" r="8.2" fill={C.blue} opacity="0.34" filter="url(#blue-ball-network-glow)" />
      </g>

      <g>
        <circle cx="17" cy="50" r="5.4" fill="url(#blue-ball-node-fill)" />
        <circle cx="17" cy="50" r="2.2" fill="#efffff" opacity="0.8" />
        <circle cx="17" cy="50" r="8.6" stroke="#4af3cb" strokeWidth="1.5" opacity="0.38" />
        <circle cx="17" cy="50" r="5.85" stroke="#0a1220" strokeWidth="0.9" opacity="0.46" />

        <circle cx="36" cy="31" r="7.3" fill="url(#blue-ball-node-fill)" />
        <circle cx="36" cy="31" r="2.8" fill="#f4fffe" opacity="0.82" />
        <circle cx="36" cy="31" r="11.8" stroke="#66ffe0" strokeWidth="1.8" opacity="0.38" />
        <circle cx="36" cy="31" r="7.8" stroke="#0a1220" strokeWidth="1" opacity="0.48" />

        <circle cx="56" cy="16" r="5.8" fill="url(#blue-ball-node-fill)" />
        <circle cx="56" cy="16" r="2.3" fill="#f4fffe" opacity="0.82" />
        <circle cx="56" cy="16" r="8.9" stroke="#66f7ff" strokeWidth="1.5" opacity="0.34" />
        <circle cx="56" cy="16" r="6.2" stroke="#0a1220" strokeWidth="0.95" opacity="0.42" />
      </g>

      <g opacity="0.72">
        <circle cx="27" cy="17" r="2.1" fill="#8fa3b8" />
        <circle cx="27" cy="17" r="3.3" stroke="#4b6272" strokeWidth="1.15" opacity="0.68" />
        <circle cx="48" cy="43" r="2.2" fill="#8fa3b8" />
        <circle cx="48" cy="43" r="3.4" stroke="#4b6272" strokeWidth="1.15" opacity="0.68" />
      </g>
    </motion.svg>
  );
}

export function ExactLogoMark({
  size = 38,
  animated = false,
}: {
  size?: number;
  animated?: boolean;
}) {
  const scale = size / ARTBOARD_SIZE;
  const transitionRepeat = animated ? Infinity : 0;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      <motion.div
        initial={animated ? { opacity: 0, scale: 0.92 } : false}
        animate={
          animated
            ? {
                opacity: [0.92, 1, 0.92],
                scale: [0.985, 1, 0.985],
              }
            : { opacity: 1, scale: 1 }
        }
        transition={
          animated
            ? { duration: 3.2, repeat: transitionRepeat, ease: 'easeInOut' }
            : undefined
        }
        style={{
          position: 'absolute',
          inset: 0,
          transformOrigin: 'center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          <motion.div
            style={{
              position: 'absolute',
              left: CENTER - 64,
              top: CENTER - 64,
              width: 128,
              height: 128,
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(25,231,187,0.24) 0%, rgba(101,225,255,0.14) 42%, rgba(5,11,26,0) 72%)',
              filter: 'blur(14px)',
            }}
            animate={
              animated
                ? { scale: [1, 1.18, 1], opacity: [0.55, 1, 0.55] }
                : { scale: 1, opacity: 0.82 }
            }
            transition={
              animated
                ? { duration: 3.5, repeat: transitionRepeat, ease: 'easeInOut' }
                : undefined
            }
          />

          <motion.svg
            viewBox="0 0 120 120"
            style={{
              position: 'absolute',
              left: 2,
              top: 2,
              width: 120,
              height: 120,
              overflow: 'visible',
            }}
            animate={animated ? { rotate: 360 } : { rotate: 0 }}
            transition={animated ? { duration: 8, repeat: transitionRepeat, ease: 'linear' } : undefined}
          >
            <defs>
              <linearGradient id="exact-logo-ring-1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={C.blue} stopOpacity="0" />
                <stop offset="50%" stopColor={C.cyan} stopOpacity="1" />
                <stop offset="100%" stopColor={C.green} stopOpacity="0" />
              </linearGradient>
            </defs>
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="url(#exact-logo-ring-1)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="60 280"
            />
          </motion.svg>

          <motion.svg
            viewBox="0 0 108 108"
            style={{
              position: 'absolute',
              left: 8,
              top: 8,
              width: 108,
              height: 108,
              overflow: 'visible',
            }}
            animate={animated ? { rotate: -360 } : { rotate: 0 }}
            transition={animated ? { duration: 5, repeat: transitionRepeat, ease: 'linear' } : undefined}
          >
            <defs>
              <linearGradient id="exact-logo-ring-2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={C.green} stopOpacity="0" />
                <stop offset="50%" stopColor={C.blue} stopOpacity="1" />
                <stop offset="100%" stopColor={C.cyan} stopOpacity="0" />
              </linearGradient>
            </defs>
            <circle
              cx="54"
              cy="54"
              r="48"
              fill="none"
              stroke="url(#exact-logo-ring-2)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="40 260"
            />
          </motion.svg>

          <motion.svg
            viewBox="0 0 92 92"
            style={{
              position: 'absolute',
              left: 16,
              top: 16,
              width: 92,
              height: 92,
              overflow: 'visible',
            }}
            animate={animated ? { rotate: 360 } : { rotate: 0 }}
            transition={animated ? { duration: 2.5, repeat: transitionRepeat, ease: 'linear' } : undefined}
          >
            <defs>
              <linearGradient id="exact-logo-ring-3" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
                <stop offset="40%" stopColor="#ffffff" stopOpacity="0.9" />
                <stop offset="60%" stopColor={C.green} stopOpacity="0.8" />
                <stop offset="100%" stopColor={C.green} stopOpacity="0" />
              </linearGradient>
            </defs>
            <circle
              cx="46"
              cy="46"
              r="40"
              fill="none"
              stroke="url(#exact-logo-ring-3)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeDasharray="25 230"
            />
          </motion.svg>

          <motion.div
            style={{
              position: 'absolute',
              left: CENTER - 54,
              top: CENTER - 54,
              width: 108,
              height: 108,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(25,231,187,0.28) 0%, rgba(101,225,255,0.08) 44%, rgba(25,231,187,0) 72%)',
            }}
            animate={
              animated
                ? { opacity: [0.5, 1, 0.5], scale: [0.95, 1.05, 0.95] }
                : { opacity: 0.72, scale: 1 }
            }
            transition={animated ? { duration: 2, repeat: transitionRepeat, ease: 'easeInOut' } : undefined}
          />

          {ORBIT_PARTICLES.map((particle, index) => (
            <motion.div
              key={`orbit-${index}`}
              style={{
                position: 'absolute',
                top: CENTER - particle.size / 2,
                left: CENTER - particle.size / 2,
                width: particle.size,
                height: particle.size,
                borderRadius: '50%',
                background: particle.color,
                boxShadow: `0 0 ${particle.size * 3}px ${particle.color}`,
              }}
              animate={
                animated
                  ? {
                      x: [
                        Math.cos((particle.angle * Math.PI) / 180) * particle.radius,
                        Math.cos(((particle.angle + 180) * Math.PI) / 180) * particle.radius,
                        Math.cos((particle.angle * Math.PI) / 180) * particle.radius,
                      ],
                      y: [
                        Math.sin((particle.angle * Math.PI) / 180) * particle.radius,
                        Math.sin(((particle.angle + 180) * Math.PI) / 180) * particle.radius,
                        Math.sin((particle.angle * Math.PI) / 180) * particle.radius,
                      ],
                      opacity: [0.3, 1, 0.3],
                      scale: [0.8, 1.4, 0.8],
                    }
                  : {
                      x: Math.cos((particle.angle * Math.PI) / 180) * particle.radius,
                      y: Math.sin((particle.angle * Math.PI) / 180) * particle.radius,
                      opacity: 0.72,
                      scale: 1,
                    }
              }
              transition={
                animated
                  ? {
                      duration: particle.duration,
                      repeat: transitionRepeat,
                      delay: particle.delay,
                      ease: 'easeInOut',
                    }
                  : undefined
              }
            />
          ))}

          {SPARKLES.map((sparkle, index) => (
            <motion.div
              key={`sparkle-${index}`}
              style={{
                position: 'absolute',
                top: CENTER - sparkle.size / 2,
                left: CENTER - sparkle.size / 2,
              width: sparkle.size,
              height: sparkle.size,
              borderRadius: '50%',
              background: '#ffffff',
              boxShadow: `0 0 6px ${C.cyan}, 0 0 12px ${C.blue}`,
            }}
              animate={
                animated
                  ? {
                      x: [sparkle.x * 0.5, sparkle.x, sparkle.x * 0.5],
                      y: [sparkle.y * 0.5, sparkle.y, sparkle.y * 0.5],
                      opacity: [0, 1, 0],
                      scale: [0, 1.5, 0],
                    }
                  : { x: sparkle.x, y: sparkle.y, opacity: 0.75, scale: 1 }
              }
              transition={
                animated
                  ? {
                      duration: 2.2,
                      repeat: transitionRepeat,
                      delay: sparkle.delay,
                      ease: 'easeInOut',
                    }
                  : undefined
              }
            />
          ))}

          <motion.div
            style={{
              position: 'absolute',
              left: CORE_OFFSET,
              top: CORE_OFFSET,
              width: CORE_SIZE,
              height: CORE_SIZE,
              borderRadius: '50%',
              overflow: 'hidden',
              zIndex: 2,
              border: '1px solid rgba(162,255,231,0.14)',
              background:
                'radial-gradient(circle at 34% 28%, #A2FFE7 0%, #19E7BB 16%, #0FA588 34%, #122235 68%, #050B1A 100%)',
            }}
            animate={
              animated
                ? {
                    boxShadow: [
                      '0 0 18px rgba(25,231,187,0.42), 0 0 36px rgba(25,231,187,0.18)',
                      '0 0 28px rgba(25,231,187,0.76), 0 0 55px rgba(101,225,255,0.32), 0 0 72px rgba(11,195,160,0.2)',
                      '0 0 18px rgba(25,231,187,0.42), 0 0 36px rgba(25,231,187,0.18)',
                    ],
                    scale: [1, 1.02, 1],
                  }
                : {
                    boxShadow:
                      '0 0 22px rgba(25,231,187,0.5), 0 0 42px rgba(101,225,255,0.2), 0 0 62px rgba(11,195,160,0.12)',
                    scale: 1,
                  }
            }
            transition={animated ? { duration: 2.5, repeat: transitionRepeat, ease: 'easeInOut' } : undefined}
          >
            <BlueBallNetworkSymbol animated={animated} />

            <motion.div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background:
                  'linear-gradient(135deg, rgba(255,255,255,0) 22%, rgba(216,251,255,0.12) 44%, rgba(255,255,255,0) 68%)',
              }}
              animate={animated ? { x: [-80, 80], opacity: [0, 1, 0] } : { x: 20, opacity: 0.5 }}
              transition={animated ? { duration: 3, repeat: transitionRepeat, repeatDelay: 2, ease: 'easeInOut' } : undefined}
            />
          </motion.div>

          <motion.div
            style={{
              position: 'absolute',
              left: 22,
              top: 19,
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: '#ffffff',
              zIndex: 3,
              boxShadow: '0 0 8px 3px rgba(255,255,255,0.7), 0 0 16px 6px rgba(25,231,187,0.5)',
            }}
            animate={animated ? { opacity: [0, 0.9, 0], scale: [0.5, 1.2, 0.5] } : { opacity: 0.78, scale: 1 }}
            transition={animated ? { duration: 3.5, repeat: transitionRepeat, repeatDelay: 1.5, ease: 'easeInOut' } : undefined}
          />
        </div>
      </motion.div>
    </div>
  );
}

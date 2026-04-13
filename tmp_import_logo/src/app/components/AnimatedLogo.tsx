import { motion } from "motion/react";

const ORBIT_PARTICLES = [
  { angle: 0,   radius: 52, size: 5, color: "#22d3ee", delay: 0,   duration: 4   },
  { angle: 72,  radius: 58, size: 3, color: "#67e8f9", delay: 0.4, duration: 5   },
  { angle: 144, radius: 50, size: 4, color: "#a78bfa", delay: 0.8, duration: 4.5 },
  { angle: 216, radius: 55, size: 3, color: "#22d3ee", delay: 1.2, duration: 3.8 },
  { angle: 288, radius: 52, size: 5, color: "#38bdf8", delay: 1.6, duration: 5.2 },
];

const SPARKLES = [
  { x: -28, y: -38, delay: 0,   size: 3 },
  { x:  30, y: -32, delay: 0.6, size: 2 },
  { x:  40, y:  18, delay: 1.2, size: 3 },
  { x: -36, y:  24, delay: 1.8, size: 2 },
  { x:   8, y:  45, delay: 0.3, size: 2 },
  { x: -10, y: -46, delay: 0.9, size: 3 },
];

export function AnimatedLogo() {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative cursor-pointer select-none"
    >
      {/* ── Logo wrapper — sized to contain all rings ── */}
      <div className="relative w-20 h-20 flex items-center justify-center">

        {/* === LAYER 1: Deep ambient aurora (pure glow, no dark fill) === */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: "-24px",
            background:
              "radial-gradient(circle, rgba(34,211,238,0.22) 0%, rgba(99,102,241,0.12) 45%, rgba(99,102,241,0) 70%)",
            filter: "blur(14px)",
          }}
          animate={{ scale: [1, 1.18, 1], opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* === LAYER 2: SVG rotating rings (NO dark fill → no dark halo) === */}
        <motion.svg
          className="absolute pointer-events-none"
          style={{ inset: "-22px", width: "calc(100% + 44px)", height: "calc(100% + 44px)" }}
          viewBox="0 0 120 120"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        >
          <circle
            cx="60" cy="60" r="54"
            fill="none"
            stroke="url(#ring1)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="60 280"
          />
          <defs>
            <linearGradient id="ring1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
              <stop offset="50%" stopColor="#22d3ee" stopOpacity="1" />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
            </linearGradient>
          </defs>
        </motion.svg>

        <motion.svg
          className="absolute pointer-events-none"
          style={{ inset: "-14px", width: "calc(100% + 28px)", height: "calc(100% + 28px)" }}
          viewBox="0 0 108 108"
          animate={{ rotate: -360 }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
        >
          <circle
            cx="54" cy="54" r="48"
            fill="none"
            stroke="url(#ring2)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="40 260"
          />
          <defs>
            <linearGradient id="ring2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#67e8f9" stopOpacity="0" />
              <stop offset="50%" stopColor="#67e8f9" stopOpacity="1" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
            </linearGradient>
          </defs>
        </motion.svg>

        <motion.svg
          className="absolute pointer-events-none"
          style={{ inset: "-6px", width: "calc(100% + 12px)", height: "calc(100% + 12px)" }}
          viewBox="0 0 92 92"
          animate={{ rotate: 360 }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
        >
          <circle
            cx="46" cy="46" r="40"
            fill="none"
            stroke="url(#ring3)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeDasharray="25 230"
          />
          <defs>
            <linearGradient id="ring3" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="40%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#22d3ee" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
            </linearGradient>
          </defs>
        </motion.svg>

        {/* === LAYER 3: Core inner glow === */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: "4px",
            background: "radial-gradient(circle, rgba(34,211,238,0.30) 0%, rgba(34,211,238,0) 70%)",
          }}
          animate={{ opacity: [0.5, 1, 0.5], scale: [0.95, 1.05, 0.95] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* === LAYER 4: Orbiting particles === */}
        {ORBIT_PARTICLES.map((p, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: p.size,
              height: p.size,
              background: p.color,
              boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
              top: "50%",
              left: "50%",
              marginTop: -p.size / 2,
              marginLeft: -p.size / 2,
            }}
            animate={{
              x: [
                Math.cos((p.angle * Math.PI) / 180) * p.radius,
                Math.cos(((p.angle + 180) * Math.PI) / 180) * p.radius,
                Math.cos((p.angle * Math.PI) / 180) * p.radius,
              ],
              y: [
                Math.sin((p.angle * Math.PI) / 180) * p.radius,
                Math.sin(((p.angle + 180) * Math.PI) / 180) * p.radius,
                Math.sin((p.angle * Math.PI) / 180) * p.radius,
              ],
              opacity: [0.3, 1, 0.3],
              scale: [0.8, 1.4, 0.8],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* === LAYER 5: Sparkle bursts === */}
        {SPARKLES.map((s, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: s.size,
              height: s.size,
              background: "#ffffff",
              boxShadow: "0 0 6px #22d3ee, 0 0 12px #22d3ee",
              top: "50%",
              left: "50%",
              marginTop: -s.size / 2,
              marginLeft: -s.size / 2,
            }}
            animate={{
              x: [s.x * 0.5, s.x, s.x * 0.5],
              y: [s.y * 0.5, s.y, s.y * 0.5],
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              delay: s.delay,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* === LAYER 6: The pure blue ball === */}
        <motion.div
          className="relative z-10 rounded-full overflow-hidden"
          style={{ 
            width: 72, 
            height: 72,
            background: "radial-gradient(circle at 35% 35%, #67e8f9 0%, #0ea5e9 40%, #0284c7 80%, #082f49 100%)"
          }}
          whileHover={{ scale: 1.1 }}
          animate={{
            boxShadow: [
              "0 0 18px rgba(34,211,238,0.5), 0 0 36px rgba(34,211,238,0.2)",
              "0 0 28px rgba(34,211,238,0.9), 0 0 55px rgba(34,211,238,0.45), 0 0 75px rgba(99,102,241,0.25)",
              "0 0 18px rgba(34,211,238,0.5), 0 0 36px rgba(34,211,238,0.2)",
            ],
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Shimmer sweep */}
          <motion.div
            className="absolute inset-0 z-20 rounded-full pointer-events-none"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.28) 50%, rgba(255,255,255,0) 70%)",
            }}
            animate={{ x: [-80, 80], opacity: [0, 1, 0] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2, ease: "easeInOut" }}
          />
        </motion.div>

        {/* === LAYER 7: Lens-flare dot === */}
        <motion.div
          className="absolute z-20 rounded-full pointer-events-none"
          style={{
            width: 5,
            height: 5,
            background: "white",
            boxShadow: "0 0 8px 3px rgba(255,255,255,0.8), 0 0 16px 6px rgba(34,211,238,0.6)",
            top: "18%",
            left: "20%",
          }}
          animate={{ opacity: [0, 0.9, 0], scale: [0.5, 1.2, 0.5] }}
          transition={{ duration: 3.5, repeat: Infinity, repeatDelay: 1.5, ease: "easeInOut" }}
        />
      </div>
    </motion.div>
  );
}

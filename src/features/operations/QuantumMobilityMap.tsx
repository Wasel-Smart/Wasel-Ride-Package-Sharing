import { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Zap, Wind, Waves, Orbit, Sparkles } from 'lucide-react';

const AMBER = '#f59a2c';
const AMBER_BRIGHT = '#ffb357';
const CYAN = '#47b7e6';
const GREEN = '#79c67d';
const PURPLE = '#a78bfa';

interface Node {
  id: string;
  name: string;
  x: number;
  y: number;
  mass: number;
  demand: number;
  color: string;
}

interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  routeId: string;
  type: 'ride' | 'package';
  progress: number;
  color: string;
}

interface Route {
  id: string;
  from: string;
  to: string;
  flow: number;
  color: string;
}

const NODES: Node[] = [
  { id: 'amman', name: 'Amman', x: 46, y: 33, mass: 2.5, demand: 0.92, color: AMBER },
  { id: 'irbid', name: 'Irbid', x: 59, y: 16, mass: 1.8, demand: 0.85, color: CYAN },
  { id: 'zarqa', name: 'Zarqa', x: 70, y: 33, mass: 1.6, demand: 0.82, color: GREEN },
  { id: 'madaba', name: 'Madaba', x: 50, y: 47, mass: 1.2, demand: 0.81, color: AMBER },
  { id: 'karak', name: 'Karak', x: 52, y: 66, mass: 1.4, demand: 0.79, color: CYAN },
  { id: 'aqaba', name: 'Aqaba', x: 44, y: 95, mass: 1.9, demand: 0.88, color: GREEN },
];

const ROUTES: Route[] = [
  { id: 'r1', from: 'amman', to: 'irbid', flow: 0.82, color: AMBER },
  { id: 'r2', from: 'amman', to: 'zarqa', flow: 0.76, color: GREEN },
  { id: 'r3', from: 'amman', to: 'madaba', flow: 0.58, color: AMBER },
  { id: 'r4', from: 'madaba', to: 'karak', flow: 0.61, color: CYAN },
  { id: 'r5', from: 'karak', to: 'aqaba', flow: 0.72, color: GREEN },
  { id: 'r6', from: 'amman', to: 'aqaba', flow: 0.93, color: AMBER },
  { id: 'r7', from: 'irbid', to: 'zarqa', flow: 0.53, color: PURPLE },
];

export function QuantumMobilityMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [mode, setMode] = useState<'flow' | 'force' | 'heat' | 'quantum'>('flow');
  const [paused, setPaused] = useState(false);
  const animationRef = useRef<number>();
  const timeRef = useRef(0);

  // Initialize particles
  useEffect(() => {
    const initialParticles: Particle[] = [];
    ROUTES.forEach((route, idx) => {
      const fromNode = NODES.find(n => n.id === route.from)!;
      const toNode = NODES.find(n => n.id === route.to)!;
      
      for (let i = 0; i < Math.floor(route.flow * 8); i++) {
        const progress = Math.random();
        const x = fromNode.x + (toNode.x - fromNode.x) * progress;
        const y = fromNode.y + (toNode.y - fromNode.y) * progress;
        
        initialParticles.push({
          id: `${route.id}-${i}`,
          x,
          y,
          vx: (toNode.x - fromNode.x) * 0.002,
          vy: (toNode.y - fromNode.y) * 0.002,
          routeId: route.id,
          type: Math.random() > 0.6 ? 'package' : 'ride',
          progress,
          color: route.color,
        });
      }
    });
    setParticles(initialParticles);
  }, []);

  // Physics simulation
  useEffect(() => {
    if (paused) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    const width = canvas.width;
    const height = canvas.height;

    const animate = () => {
      timeRef.current += 0.016;
      const t = timeRef.current;

      // Clear with fade trail
      ctx.fillStyle = 'rgba(15, 17, 19, 0.15)';
      ctx.fillRect(0, 0, width, height);

      // Draw aurora background
      if (mode === 'quantum' || mode === 'heat') {
        NODES.forEach(node => {
          const gradient = ctx.createRadialGradient(
            (node.x / 100) * width,
            (node.y / 100) * height,
            0,
            (node.x / 100) * width,
            (node.y / 100) * height,
            node.mass * 80 + Math.sin(t * 2 + node.x) * 20
          );
          gradient.addColorStop(0, `${node.color}${mode === 'heat' ? '40' : '20'}`);
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, width, height);
        });
      }

      // Draw force field vectors
      if (mode === 'force') {
        const gridSize = 40;
        ctx.strokeStyle = `${AMBER}30`;
        ctx.lineWidth = 1;
        
        for (let gx = 0; gx < width; gx += gridSize) {
          for (let gy = 0; gy < height; gy += gridSize) {
            let fx = 0, fy = 0;
            
            NODES.forEach(node => {
              const nx = (node.x / 100) * width;
              const ny = (node.y / 100) * height;
              const dx = nx - gx;
              const dy = ny - gy;
              const dist = Math.sqrt(dx * dx + dy * dy) + 1;
              const force = (node.mass * 500) / (dist * dist);
              fx += (dx / dist) * force;
              fy += (dy / dist) * force;
            });
            
            const mag = Math.sqrt(fx * fx + fy * fy);
            if (mag > 0.1) {
              ctx.beginPath();
              ctx.moveTo(gx, gy);
              ctx.lineTo(gx + (fx / mag) * 15, gy + (fy / mag) * 15);
              ctx.stroke();
            }
          }
        }
      }

      // Draw routes with flow animation
      ROUTES.forEach(route => {
        const fromNode = NODES.find(n => n.id === route.from)!;
        const toNode = NODES.find(n => n.id === route.to)!;
        
        const x1 = (fromNode.x / 100) * width;
        const y1 = (fromNode.y / 100) * height;
        const x2 = (toNode.x / 100) * width;
        const y2 = (toNode.y / 100) * height;

        // Bezier curve for natural flow
        const cx1 = x1 + (x2 - x1) * 0.25;
        const cy1 = y1 + (y2 - y1) * 0.1;
        const cx2 = x1 + (x2 - x1) * 0.75;
        const cy2 = y1 + (y2 - y1) * 0.9;

        // Base route
        ctx.strokeStyle = `${route.color}20`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.bezierCurveTo(cx1, cy1, cx2, cy2, x2, y2);
        ctx.stroke();

        // Animated flow line
        if (mode === 'flow') {
          const flowOffset = (t * 50) % 100;
          ctx.strokeStyle = `${route.color}80`;
          ctx.lineWidth = 2;
          ctx.setLineDash([20, 30]);
          ctx.lineDashOffset = -flowOffset;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.bezierCurveTo(cx1, cy1, cx2, cy2, x2, y2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });

      // Draw nodes with pulsing effect
      NODES.forEach(node => {
        const x = (node.x / 100) * width;
        const y = (node.y / 100) * height;
        const pulse = 1 + Math.sin(t * 3 + node.x) * 0.15;
        const radius = node.mass * 12 * pulse;

        // Outer glow
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 2);
        gradient.addColorStop(0, `${node.color}40`);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius * 2, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Inner highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Demand ring
        if (mode === 'heat') {
          ctx.strokeStyle = `${node.color}80`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(x, y, radius * (1 + node.demand), 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      // Update and draw particles
      setParticles(prev => {
        return prev.map(p => {
          let { x, y, vx, vy } = p;
          const route = ROUTES.find(r => r.id === p.routeId)!;
          const fromNode = NODES.find(n => n.id === route.from)!;
          const toNode = NODES.find(n => n.id === route.to)!;

          // Apply forces from nodes
          NODES.forEach(node => {
            const nx = node.x;
            const ny = node.y;
            const dx = nx - x;
            const dy = ny - y;
            const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
            
            // Attraction to destination, repulsion from others
            const isDestination = node.id === toNode.id;
            const force = isDestination 
              ? (node.mass * 0.0008) / dist
              : -(node.mass * 0.0002) / (dist * dist);
            
            vx += (dx / dist) * force;
            vy += (dy / dist) * force;
          });

          // Damping
          vx *= 0.98;
          vy *= 0.98;

          // Update position
          x += vx;
          y += vy;

          // Check if reached destination
          const dx = toNode.x - x;
          const dy = toNode.y - y;
          const distToTarget = Math.sqrt(dx * dx + dy * dy);

          if (distToTarget < 2) {
            // Reset to start
            x = fromNode.x;
            y = fromNode.y;
            vx = (toNode.x - fromNode.x) * 0.002;
            vy = (toNode.y - fromNode.y) * 0.002;
          }

          // Draw particle
          const px = (x / 100) * width;
          const py = (y / 100) * height;
          
          if (mode === 'quantum') {
            // Quantum uncertainty cloud
            for (let i = 0; i < 3; i++) {
              const offset = Math.random() * 8 - 4;
              ctx.fillStyle = `${p.color}${Math.floor(Math.random() * 40 + 20).toString(16)}`;
              ctx.beginPath();
              ctx.arc(px + offset, py + offset, 2, 0, Math.PI * 2);
              ctx.fill();
            }
          } else {
            // Regular particle
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(px, py, p.type === 'package' ? 3 : 2.5, 0, Math.PI * 2);
            ctx.fill();
            
            // Trail
            ctx.fillStyle = `${p.color}40`;
            ctx.beginPath();
            ctx.arc(px - vx * 50, py - vy * 50, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }

          return { ...p, x, y, vx, vy };
        });
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [mode, paused]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 600, background: '#0f1113', borderRadius: 24, overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        width={1200}
        height={800}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />

      {/* Mode Controls */}
      <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 8, flexDirection: 'column' }}>
        {[
          { key: 'flow', icon: <Waves size={14} />, label: 'Flow' },
          { key: 'force', icon: <Wind size={14} />, label: 'Force' },
          { key: 'heat', icon: <Activity size={14} />, label: 'Heat' },
          { key: 'quantum', icon: <Sparkles size={14} />, label: 'Quantum' },
        ].map(({ key, icon, label }) => (
          <button
            key={key}
            onClick={() => setMode(key as typeof mode)}
            style={{
              padding: '8px 14px',
              borderRadius: 12,
              border: `1px solid ${mode === key ? AMBER : '#313841'}`,
              background: mode === key ? `${AMBER}20` : 'rgba(255,255,255,0.05)',
              color: mode === key ? AMBER : '#b9aea0',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Pause Control */}
      <button
        onClick={() => setPaused(p => !p)}
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          padding: '10px 16px',
          borderRadius: 12,
          border: `1px solid ${AMBER}`,
          background: paused ? `${AMBER}20` : 'rgba(255,255,255,0.05)',
          color: AMBER,
          fontSize: '0.8rem',
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        {paused ? 'Resume' : 'Pause'}
      </button>

      {/* Stats Overlay */}
      <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ padding: '8px 12px', borderRadius: 12, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)', border: '1px solid #313841' }}>
          <div style={{ fontSize: '0.7rem', color: '#8b8277', marginBottom: 4 }}>Active Particles</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: AMBER }}>{particles.length}</div>
        </div>
        <div style={{ padding: '8px 12px', borderRadius: 12, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)', border: '1px solid #313841' }}>
          <div style={{ fontSize: '0.7rem', color: '#8b8277', marginBottom: 4 }}>Mode</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: CYAN, textTransform: 'capitalize' }}>{mode}</div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ position: 'absolute', bottom: 16, left: 16, padding: '10px 14px', borderRadius: 12, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)', border: '1px solid #313841', display: 'flex', gap: 12, fontSize: '0.7rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: AMBER }} />
          <span style={{ color: '#b9aea0' }}>Rides</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: GREEN }} />
          <span style={{ color: '#b9aea0' }}>Packages</span>
        </div>
      </div>
    </div>
  );
}

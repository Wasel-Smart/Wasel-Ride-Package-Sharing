import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, QuadraticBezierLine } from '@react-three/drei';
import * as THREE from 'three';
import { C } from '../../../utils/wasel-ds';
import { POPULAR_ROUTES } from '../HomePageShared';

const GLOBE_RADIUS = 1.6;

// Brand tokens, not hardcoded hex. wasel-ds.ts is the single source of truth
// (docs/BRAND_GUIDELINES.md). Per the token file's own guidance, info/map/
// data-viz surfaces reference `teal` rather than the `cyan` compatibility alias.
const GLOBE_SHELL_COLOR = C.teal;
const GLOBE_CORE_COLOR = C.navyMid;
const HUB_COLOR = C.gold;

// Approximate real-world coordinates for the Jordanian destinations in
// POPULAR_ROUTES. This isn't a literal map — just enough geographic
// grounding for the stylised globe below to feel like a real network
// rather than an abstract decoration.
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Amman: { lat: 31.9539, lng: 35.9106 },
  Aqaba: { lat: 29.5321, lng: 35.0063 },
  Irbid: { lat: 32.5556, lng: 35.85 },
  'Dead Sea': { lat: 31.75, lng: 35.58 },
  Petra: { lat: 30.3285, lng: 35.4444 },
  'Wadi Rum': { lat: 29.5768, lng: 35.4206 },
  Zarqa: { lat: 32.0728, lng: 36.0876 },
};

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function arcMidpoint(a: THREE.Vector3, b: THREE.Vector3, lift: number): THREE.Vector3 {
  return a.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(GLOBE_RADIUS + lift);
}

interface CorridorArc {
  key: string;
  from: THREE.Vector3;
  to: THREE.Vector3;
  mid: THREE.Vector3;
  color: string;
  /** Stable per-arc pulse speed, derived once so it survives re-renders. */
  speed: number;
}

function CorridorPulse({ arc, speed }: { arc: CorridorArc; speed: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const curve = useMemo(() => new THREE.QuadraticBezierCurve3(arc.from, arc.mid, arc.to), [arc]);

  useFrame(({ clock }) => {
    if (!ref.current) {return;}
    const t = (clock.getElapsedTime() * speed) % 1;
    ref.current.position.copy(curve.getPoint(t));
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.028, 8, 8]} />
      <meshBasicMaterial color={arc.color} toneMapped={false} />
    </mesh>
  );
}

function Marker({
  position,
  color,
  size = 0.045,
  reduceMotion,
}: {
  position: THREE.Vector3;
  color: string;
  size?: number;
  reduceMotion: boolean;
}) {
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  // BRAND_GUIDELINES.md — "Pulse animations are opacity-only — no glow".
  // Previously this scaled the mesh, which also made markers visibly swell
  // against the globe surface. Opacity keeps the footprint constant.
  useFrame(({ clock }) => {
    if (!materialRef.current) {return;}
    if (reduceMotion) {
      // Reset rather than bail, so toggling the OS setting mid-animation can't
      // strand a marker at a dim phase of the sine.
      materialRef.current.opacity = 1;
      return;
    }
    materialRef.current.opacity = 0.72 + Math.sin(clock.getElapsedTime() * 2.4) * 0.28;
  });

  return (
    <mesh position={position}>
      <sphereGeometry args={[size, 12, 12]} />
      <meshBasicMaterial ref={materialRef} color={color} toneMapped={false} transparent opacity={1} />
    </mesh>
  );
}

function GlobeCore({ reduceMotion }: { reduceMotion: boolean }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (reduceMotion || !groupRef.current) {return;}
    groupRef.current.rotation.y += delta * 0.08;
  });

  const arcs = useMemo<CorridorArc[]>(() => {
    const hub = CITY_COORDS.Amman;
    if (!hub) {return [];}
    const hubVec = latLngToVector3(hub.lat, hub.lng, GLOBE_RADIUS);

    return POPULAR_ROUTES.filter(route => Boolean(CITY_COORDS[route.to])).map(route => {
      const dest = CITY_COORDS[route.to]!;
      const destVec = latLngToVector3(dest.lat, dest.lng, GLOBE_RADIUS);
      return {
        key: `${route.from}-${route.to}`,
        from: hubVec,
        to: destVec,
        mid: arcMidpoint(hubVec, destVec, 0.55),
        color: route.color,
        // Deterministic: longer corridors move slightly slower, so the speed is
        // stable across re-renders and reads as distance rather than noise.
        speed: 0.26 - Math.min(route.dist, 350) / 350 * 0.1,
      };
    });
  }, []);

  return (
    <group ref={groupRef}>
      {/* Solid inner body. Opaque on purpose: it writes depth, so corridors on
          the far side are occluded instead of bleeding through the front. Lit
          (standard, not basic) so the sphere reads as a volume rather than a
          flat disc. */}
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS * 0.985, 48, 48]} />
        <meshStandardMaterial color={GLOBE_CORE_COLOR} roughness={0.85} metalness={0.05} />
      </mesh>
      {/* Wireframe shell — abstracted, not a literal map texture, to match
          the app's dark/glass/neon design system rather than a stock globe. */}
      <mesh>
        <icosahedronGeometry args={[GLOBE_RADIUS, 3]} />
        <meshBasicMaterial color={GLOBE_SHELL_COLOR} wireframe transparent opacity={0.28} />
      </mesh>

      {arcs.map(arc => (
        <group key={arc.key}>
          <QuadraticBezierLine
            start={arc.from}
            mid={arc.mid}
            end={arc.to}
            color={arc.color}
            lineWidth={1.4}
            transparent
            opacity={0.55}
          />
          {!reduceMotion && <CorridorPulse arc={arc} speed={arc.speed} />}
        </group>
      ))}

      <Marker
        position={latLngToVector3(CITY_COORDS.Amman!.lat, CITY_COORDS.Amman!.lng, GLOBE_RADIUS)}
        color={HUB_COLOR}
        size={0.06}
        reduceMotion={reduceMotion}
      />
      {arcs.map(arc => (
        <Marker key={`marker-${arc.key}`} position={arc.to} color={arc.color} reduceMotion={reduceMotion} />
      ))}
    </group>
  );
}

export default function CorridorGlobeScene({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <Canvas camera={{ position: [0, 0.4, 4.2], fov: 42 }} dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }}>
      {/* Ambient alone is flat. The key light sits front-right of camera so the
          globe has a terminator and reads as a sphere; the cool rim separates
          its silhouette from the navy page background behind the canvas. */}
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 2.5, 4]} intensity={1.15} />
      <directionalLight position={[-4, -1, -3]} intensity={0.35} color={C.teal} />
      <GlobeCore reduceMotion={reduceMotion} />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate={false}
        minPolarAngle={Math.PI / 2.6}
        maxPolarAngle={Math.PI / 1.7}
      />
    </Canvas>
  );
}

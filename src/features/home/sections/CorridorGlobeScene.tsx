import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, QuadraticBezierLine } from '@react-three/drei';
import * as THREE from 'three';
import { POPULAR_ROUTES } from '../HomePageShared';

const GLOBE_RADIUS = 1.6;

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

function Marker({ position, color, size = 0.045 }: { position: THREE.Vector3; color: string; size?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) {return;}
    ref.current.scale.setScalar(1 + Math.sin(clock.getElapsedTime() * 2.4) * 0.12);
  });
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[size, 12, 12]} />
      <meshBasicMaterial color={color} toneMapped={false} />
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
      };
    });
  }, []);

  return (
    <group ref={groupRef}>
      {/* Inner glow sphere */}
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS * 0.985, 48, 48]} />
        <meshBasicMaterial color="#0a2540" transparent opacity={0.55} />
      </mesh>
      {/* Wireframe shell — abstracted, not a literal map texture, to match
          the app's dark/glass/neon design system rather than a stock globe. */}
      <mesh>
        <icosahedronGeometry args={[GLOBE_RADIUS, 3]} />
        <meshBasicMaterial color="#147FE4" wireframe transparent opacity={0.28} />
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
          {!reduceMotion && <CorridorPulse arc={arc} speed={0.18 + Math.random() * 0.1} />}
        </group>
      ))}

      <Marker
        position={latLngToVector3(CITY_COORDS.Amman!.lat, CITY_COORDS.Amman!.lng, GLOBE_RADIUS)}
        color="#FFBE5C"
        size={0.06}
      />
      {arcs.map(arc => (
        <Marker key={`marker-${arc.key}`} position={arc.to} color={arc.color} />
      ))}
    </group>
  );
}

export default function CorridorGlobeScene({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <Canvas camera={{ position: [0, 0.4, 4.2], fov: 42 }} dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.6} />
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

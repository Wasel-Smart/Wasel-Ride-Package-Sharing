import { useEffect, useMemo, useState } from 'react';

type City = {
  id: string;
  label: string;
  labelAr: string;
  lat: number;
  lon: number;
  tier: 1 | 2 | 3;
  featured?: boolean;
};

type Corridor = {
  id: string;
  from: string;
  to: string;
  passengerFlow: number;
  packageFlow: number;
  packageBias?: number;
};

type Point = { x: number; y: number };

const VIEWBOX_WIDTH = 720;
const VIEWBOX_HEIGHT = 560;
const PASSENGER_COLOR = '#47B7E6';
const PASSENGER_GLOW = 'rgba(71, 183, 230, 0.36)';
const PACKAGE_COLOR = '#FFC857';
const PACKAGE_GLOW = 'rgba(255, 200, 87, 0.28)';

const CITIES: readonly City[] = [
  {
    id: 'amman',
    label: 'Amman',
    labelAr: 'عمّان',
    lat: 31.9454,
    lon: 35.9284,
    tier: 1,
    featured: true,
  },
  { id: 'aqaba', label: 'Aqaba', labelAr: 'العقبة', lat: 29.532, lon: 35.0063, tier: 1 },
  { id: 'irbid', label: 'Irbid', labelAr: 'إربد', lat: 32.5556, lon: 35.85, tier: 1 },
  { id: 'zarqa', label: 'Zarqa', labelAr: 'الزرقاء', lat: 32.0728, lon: 36.088, tier: 1 },
  { id: 'mafraq', label: 'Mafraq', labelAr: 'المفرق', lat: 32.3406, lon: 36.208, tier: 2 },
  {
    id: 'jerash',
    label: 'Jerash',
    labelAr: 'جرش',
    lat: 32.2803,
    lon: 35.8993,
    tier: 2,
    featured: true,
  },
  { id: 'ajloun', label: 'Ajloun', labelAr: 'عجلون', lat: 32.3326, lon: 35.7519, tier: 2 },
  { id: 'salt', label: 'Salt', labelAr: 'السلط', lat: 32.0392, lon: 35.7272, tier: 2 },
  { id: 'karak', label: 'Karak', labelAr: 'الكرك', lat: 31.1853, lon: 35.7048, tier: 2 },
  { id: 'tafila', label: 'Tafila', labelAr: 'الطفيلة', lat: 30.8375, lon: 35.6042, tier: 3 },
  { id: 'maan', label: "Ma'an", labelAr: 'معان', lat: 30.1962, lon: 35.736, tier: 3 },
  { id: 'madaba', label: 'Madaba', labelAr: 'مادبا', lat: 31.7197, lon: 35.7936, tier: 2 },
] as const;

const CORRIDORS: readonly Corridor[] = [
  {
    id: 'amman-aqaba',
    from: 'amman',
    to: 'aqaba',
    passengerFlow: 88,
    packageFlow: 54,
    packageBias: 0.52,
  },
  {
    id: 'amman-jerash',
    from: 'amman',
    to: 'jerash',
    passengerFlow: 96,
    packageFlow: 34,
    packageBias: 0.33,
  },
  {
    id: 'amman-zarqa',
    from: 'amman',
    to: 'zarqa',
    passengerFlow: 84,
    packageFlow: 40,
    packageBias: 0.42,
  },
  {
    id: 'zarqa-mafraq',
    from: 'zarqa',
    to: 'mafraq',
    passengerFlow: 52,
    packageFlow: 38,
    packageBias: 0.48,
  },
  {
    id: 'amman-irbid',
    from: 'amman',
    to: 'irbid',
    passengerFlow: 74,
    packageFlow: 32,
    packageBias: 0.38,
  },
  {
    id: 'irbid-ajloun',
    from: 'irbid',
    to: 'ajloun',
    passengerFlow: 42,
    packageFlow: 20,
    packageBias: 0.28,
  },
  {
    id: 'amman-madaba',
    from: 'amman',
    to: 'madaba',
    passengerFlow: 55,
    packageFlow: 26,
    packageBias: 0.35,
  },
  {
    id: 'madaba-karak',
    from: 'madaba',
    to: 'karak',
    passengerFlow: 48,
    packageFlow: 28,
    packageBias: 0.42,
  },
  {
    id: 'karak-tafila',
    from: 'karak',
    to: 'tafila',
    passengerFlow: 36,
    packageFlow: 22,
    packageBias: 0.46,
  },
  {
    id: 'tafila-maan',
    from: 'tafila',
    to: 'maan',
    passengerFlow: 32,
    packageFlow: 18,
    packageBias: 0.5,
  },
  {
    id: 'maan-aqaba',
    from: 'maan',
    to: 'aqaba',
    passengerFlow: 44,
    packageFlow: 30,
    packageBias: 0.58,
  },
  {
    id: 'salt-jerash',
    from: 'salt',
    to: 'jerash',
    passengerFlow: 26,
    packageFlow: 14,
    packageBias: 0.22,
  },
] as const;

const BORDER = [
  { lat: 33.37, lon: 35.55 },
  { lat: 32.58, lon: 36.42 },
  { lat: 31.24, lon: 37.12 },
  { lat: 29.62, lon: 36.22 },
  { lat: 29.2, lon: 35.03 },
  { lat: 31.2, lon: 35.5 },
  { lat: 32.56, lon: 35.55 },
] as const;

const COPY = {
  en: {
    mapLabel: 'Jordan mobility simulation',
    passengerLegend: 'Ride flow',
    packageLegend: 'Package flow',
    networkLegend: 'One shared network',
    srDescription:
      'Animated mobility map of Jordan showing ride flow and package flow moving between Aqaba, Ma an, Tafila, Karak, Madaba, Amman, Salt, Ajloun, Jerash, Zarqa, Mafraq, and Irbid.',
  },
  ar: {
    mapLabel: 'محاكاة الحركة في الأردن',
    passengerLegend: 'حركة الرحلات',
    packageLegend: 'حركة الطرود',
    networkLegend: 'شبكة واحدة مشتركة',
    srDescription:
      'خريطة حركة متحركة للأردن تعرض تدفق الرحلات وتدفق الطرود بين العقبة ومعان والطفيلة والكرك ومادبا وعمّان والسلط وعجلون وجرش والزرقاء والمفرق وإربد.',
  },
} as const;

function mercator(lat: number) {
  return Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
}

const bounds = CITIES.reduce(
  (acc, city) => ({
    minLat: Math.min(acc.minLat, city.lat),
    maxLat: Math.max(acc.maxLat, city.lat),
    minLon: Math.min(acc.minLon, city.lon),
    maxLon: Math.max(acc.maxLon, city.lon),
  }),
  { minLat: Infinity, maxLat: -Infinity, minLon: Infinity, maxLon: -Infinity },
);

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function project(lat: number, lon: number): Point {
  const padX = VIEWBOX_WIDTH * 0.14;
  const padY = VIEWBOX_HEIGHT * 0.12;
  const x =
    padX +
    ((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon || 1)) * (VIEWBOX_WIDTH - padX * 2);
  const minY = mercator(bounds.minLat);
  const maxY = mercator(bounds.maxLat);
  const y = padY + (1 - (mercator(lat) - minY) / (maxY - minY || 1)) * (VIEWBOX_HEIGHT - padY * 2);
  return { x, y };
}

function getCurve(from: Point, to: Point, seed: number) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const direction = seed % 2 === 0 ? 1 : -1;
  const offset = clamp(length * 0.12, 18, 44) * direction;

  return {
    x: (from.x + to.x) / 2 - (dy / length) * offset,
    y: (from.y + to.y) / 2 + (dx / length) * offset,
  };
}

function pointOnQuadratic(start: Point, control: Point, end: Point, t: number): Point {
  const mt = 1 - t;
  return {
    x: mt * mt * start.x + 2 * mt * t * control.x + t * t * end.x,
    y: mt * mt * start.y + 2 * mt * t * control.y + t * t * end.y,
  };
}

function pathFor(start: Point, control: Point, end: Point) {
  return `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`;
}

function labelFor(city: City, ar: boolean) {
  return ar ? city.labelAr : city.label;
}

export function MobilityOSLandingMap({ ar = false }: { ar?: boolean }) {
  const [phase, setPhase] = useState(0);
  const copy = ar ? COPY.ar : COPY.en;
  const overlayLabels = ar
    ? ['محاكاة Mobility OS الحية', 'الرحلات والطرود على نفس المسارات', 'واضحة على الهاتف والويب']
    : [
        'Mobility OS live simulation',
        'Rides and packages share the same routes',
        'Readable on mobile and web',
      ];

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return undefined;

    const intervalId = window.setInterval(() => {
      setPhase(current => (current + 1) % 2000);
    }, 60);

    return () => window.clearInterval(intervalId);
  }, []);

  const cityPoints = useMemo(
    () =>
      CITIES.map(city => ({
        ...city,
        point: project(city.lat, city.lon),
      })),
    [],
  );

  const cityMap = useMemo(
    () => new Map(cityPoints.map(city => [city.id, city] as const)),
    [cityPoints],
  );

  const borderPath = useMemo(() => {
    return BORDER.map((point, index) => {
      const projected = project(point.lat, point.lon);
      return `${index === 0 ? 'M' : 'L'} ${projected.x} ${projected.y}`;
    }).join(' ');
  }, []);

  const corridorGeometry = useMemo(
    () =>
      CORRIDORS.map((corridor, index) => {
        const from = cityMap.get(corridor.from)?.point ?? { x: 0, y: 0 };
        const to = cityMap.get(corridor.to)?.point ?? { x: 0, y: 0 };
        const control = getCurve(from, to, index + 2);
        const highlighted = corridor.id === 'amman-jerash' || corridor.id === 'amman-aqaba';

        return {
          ...corridor,
          from,
          to,
          control,
          path: pathFor(from, control, to),
          highlighted,
        };
      }),
    [cityMap],
  );

  const passengerParticles = useMemo(() => {
    return corridorGeometry.flatMap((corridor, corridorIndex) => {
      const count = corridor.highlighted ? 6 : Math.max(2, Math.round(corridor.passengerFlow / 20));

      return Array.from({ length: count }, (_, index) => {
        const travel = (phase * 0.014 * (1 + corridorIndex * 0.045) + index / count) % 1;
        return {
          id: `${corridor.id}-ride-${index}`,
          point: pointOnQuadratic(corridor.from, corridor.control, corridor.to, travel),
          radius: corridor.highlighted ? 3.2 : 2.5,
        };
      });
    });
  }, [corridorGeometry, phase]);

  const packageParticles = useMemo(() => {
    return corridorGeometry.flatMap((corridor, corridorIndex) => {
      const count = corridor.highlighted ? 4 : Math.max(1, Math.round(corridor.packageFlow / 18));

      return Array.from({ length: count }, (_, index) => {
        const travel =
          1 -
          ((phase * 0.01 * (1.08 + corridorIndex * 0.03) +
            (index / count) * (corridor.packageBias ?? 0.5) +
            index * 0.07) %
            1);
        return {
          id: `${corridor.id}-pkg-${index}`,
          point: pointOnQuadratic(corridor.from, corridor.control, corridor.to, travel),
          size: corridor.highlighted ? 5 : 4,
        };
      });
    });
  }, [corridorGeometry, phase]);

  return (
    <figure
      aria-label={copy.mapLabel}
      style={{
        margin: 0,
        display: 'grid',
        gap: 12,
      }}
    >
      <style>{`
        .landing-sim-shell {
          position: relative;
          min-height: clamp(320px, 52vw, 520px);
          border-radius: 30px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.06);
          background:
            radial-gradient(circle at 16% 14%, rgba(71,183,230,0.14), rgba(4,18,30,0) 24%),
            radial-gradient(circle at 74% 78%, rgba(168,214,20,0.08), rgba(4,18,30,0) 22%),
            linear-gradient(180deg, rgba(8,20,35,0.96), rgba(3,12,24,0.98));
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.03),
            0 28px 72px rgba(0,0,0,0.26);
        }
        .landing-sim-shell::before {
          content: '';
          position: absolute;
          inset: 16px;
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,0.05);
          background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0));
          pointer-events: none;
        }
        .landing-sim-shell::after {
          content: '';
          position: absolute;
          inset: 0;
          background:
            linear-gradient(90deg, rgba(255,255,255,0.02) 0, rgba(255,255,255,0) 20%, rgba(255,255,255,0) 80%, rgba(255,255,255,0.02) 100%);
          pointer-events: none;
          mix-blend-mode: screen;
          opacity: 0.65;
        }
        .landing-sim-legend {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
        }
        .landing-sim-overlay {
          position: absolute;
          top: 16px;
          left: 16px;
          right: 16px;
          z-index: 1;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
          pointer-events: none;
        }
        .landing-sim-chip {
          display: inline-flex;
          align-items: center;
          min-height: 34px;
          padding: 0 12px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(5,16,29,0.72);
          color: rgba(236,244,252,0.94);
          font-size: 0.74rem;
          font-weight: 800;
          letter-spacing: 0.02em;
          backdrop-filter: blur(18px);
        }
        .landing-sim-pill {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          min-height: 44px;
          padding: 0 14px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          color: rgba(232,242,252,0.92);
          font-size: 0.86rem;
          font-weight: 700;
        }
        .landing-sim-line,
        .landing-sim-dash {
          width: 30px;
          height: 0;
          flex: 0 0 auto;
          border-top: 3px solid ${PASSENGER_COLOR};
          border-radius: 999px;
          box-shadow: 0 0 12px ${PASSENGER_GLOW};
        }
        .landing-sim-dash {
          border-top-style: dashed;
          border-top-color: ${PACKAGE_COLOR};
          box-shadow: 0 0 12px ${PACKAGE_GLOW};
        }
        .landing-sim-network-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #92FF70;
          box-shadow: 0 0 12px rgba(146,255,112,0.42);
        }
        @media (max-width: 720px) {
          .landing-sim-shell {
            min-height: clamp(300px, 84vw, 440px);
          }
          .landing-sim-overlay {
            top: 12px;
            left: 12px;
            right: 12px;
          }
          .landing-sim-chip {
            min-height: 30px;
            padding: 0 10px;
            font-size: 0.68rem;
          }
        }
      `}</style>

      <div className="landing-sim-shell">
        <span
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            padding: 0,
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: 0,
          }}
        >
          {copy.srDescription}
        </span>
        <div className="landing-sim-overlay" aria-hidden="true">
          {overlayLabels.map(label => (
            <div key={label} className="landing-sim-chip">
              {label}
            </div>
          ))}
        </div>

        <svg
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          role="img"
          aria-hidden="true"
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          <defs>
            <linearGradient
              id="landing-ride-gradient"
              x1="80"
              y1="520"
              x2="560"
              y2="60"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor="#47B7E6" />
              <stop offset="0.48" stopColor="#A7F7FF" />
              <stop offset="1" stopColor="#47B7E6" />
            </linearGradient>
            <linearGradient
              id="landing-package-gradient"
              x1="110"
              y1="500"
              x2="560"
              y2="80"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor="#FFC857" />
              <stop offset="0.52" stopColor="#FFE09A" />
              <stop offset="1" stopColor="#FFC857" />
            </linearGradient>
            <radialGradient
              id="landing-map-scan"
              cx="0"
              cy="0"
              r="1"
              gradientUnits="userSpaceOnUse"
              gradientTransform="translate(368 184) rotate(40) scale(164 136)"
            >
              <stop stopColor="#47B7E6" stopOpacity="0.18" />
              <stop offset="1" stopColor="#47B7E6" stopOpacity="0" />
            </radialGradient>
          </defs>

          <path
            d={borderPath}
            fill="rgba(7,18,31,0.84)"
            stroke="rgba(165,184,204,0.12)"
            strokeWidth="1.5"
          />
          <path
            d={borderPath}
            fill="none"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="14"
            opacity="0.24"
            transform="translate(10 18)"
          />
          <rect x="56" y="38" width="174" height="2" fill="rgba(229,239,250,0.05)" />
          <rect x="56" y="72" width="142" height="2" fill="rgba(229,239,250,0.04)" />
          <rect x="88" y="28" width="2" height="494" fill="rgba(229,239,250,0.04)" />
          <rect x="122" y="28" width="2" height="494" fill="rgba(229,239,250,0.03)" />
          <circle cx="214" cy="92" r="32" fill="url(#landing-map-scan)" />

          {corridorGeometry.map(corridor => (
            <g key={`${corridor.id}-route`}>
              <path
                d={corridor.path}
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth={corridor.highlighted ? 10 : 7}
                strokeLinecap="round"
              />
              <path
                d={corridor.path}
                fill="none"
                stroke="url(#landing-ride-gradient)"
                strokeWidth={corridor.highlighted ? 3.8 : 2.8}
                strokeLinecap="round"
                opacity={corridor.highlighted ? 1 : 0.82}
                filter={
                  corridor.highlighted ? 'drop-shadow(0 0 12px rgba(71,183,230,0.30))' : undefined
                }
              />
              <path
                d={corridor.path}
                fill="none"
                stroke="url(#landing-package-gradient)"
                strokeWidth={corridor.highlighted ? 2.8 : 2.2}
                strokeLinecap="round"
                strokeDasharray="7 10"
                opacity={corridor.highlighted ? 0.96 : 0.72}
              />
            </g>
          ))}

          {passengerParticles.map(particle => (
            <circle
              key={particle.id}
              cx={particle.point.x}
              cy={particle.point.y}
              r={particle.radius}
              fill="#EAFBFF"
              style={{ filter: `drop-shadow(0 0 7px ${PASSENGER_GLOW})` }}
            />
          ))}

          {packageParticles.map(particle => (
            <rect
              key={particle.id}
              x={particle.point.x - particle.size / 2}
              y={particle.point.y - particle.size / 2}
              width={particle.size}
              height={particle.size}
              rx="1.4"
              fill={PACKAGE_COLOR}
              style={{ filter: `drop-shadow(0 0 7px ${PACKAGE_GLOW})` }}
            />
          ))}

          {cityPoints.map(city => (
            <g key={city.id}>
              {city.featured ? (
                <circle cx={city.point.x} cy={city.point.y} r="26" fill="rgba(71,183,230,0.07)" />
              ) : null}
              <circle
                cx={city.point.x}
                cy={city.point.y}
                r={city.tier === 1 ? 5.5 : city.tier === 2 ? 4.6 : 4}
                fill="#EFF8FF"
              />
              <circle
                cx={city.point.x}
                cy={city.point.y}
                r={city.featured ? 10.5 : 8}
                fill="none"
                stroke={city.featured ? 'rgba(71,183,230,0.34)' : 'rgba(239,248,255,0.16)'}
              />
              <text
                x={city.point.x + (city.id === 'aqaba' ? -26 : city.id === 'mafraq' ? -14 : -20)}
                y={city.point.y + (city.id === 'maan' ? -18 : -16)}
                fill={city.featured ? '#F4FAFF' : 'rgba(228,238,248,0.74)'}
                fontSize={city.featured ? 15.5 : 13.5}
                fontWeight={city.featured ? 700 : 600}
                style={{ letterSpacing: '-0.02em' }}
              >
                {labelFor(city, ar)}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <figcaption className="landing-sim-legend">
        <div className="landing-sim-pill">
          <span className="landing-sim-line" aria-hidden="true" />
          <span>{copy.passengerLegend}</span>
        </div>
        <div className="landing-sim-pill">
          <span className="landing-sim-dash" aria-hidden="true" />
          <span>{copy.packageLegend}</span>
        </div>
        <div className="landing-sim-pill">
          <span className="landing-sim-network-dot" aria-hidden="true" />
          <span>{copy.networkLegend}</span>
        </div>
      </figcaption>
    </figure>
  );
}

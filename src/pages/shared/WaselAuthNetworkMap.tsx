import { useId } from 'react';

type NetworkTier = 'hub' | 'relay' | 'edge';
type RouteKind = 'primary' | 'secondary' | 'package';

type NetworkCity = {
  id: string;
  label: string;
  x: number;
  y: number;
  tier: NetworkTier;
  score: number;
  labelDx: number;
  labelDy: number;
  anchor?: 'start' | 'middle' | 'end';
};

type NetworkRoute = {
  id: string;
  from: string;
  to: string;
  curvature: number;
  width: number;
  kind: RouteKind;
  duration: number;
  delay: number;
  tag?: string;
  labelT?: number;
};

type Point = {
  x: number;
  y: number;
};

const VIEW_BOX_WIDTH = 760;
const VIEW_BOX_HEIGHT = 520;

const NETWORK_CITIES: NetworkCity[] = [
  {
    id: 'aqaba',
    label: 'Aqaba',
    x: 118,
    y: 452,
    tier: 'relay',
    score: 0.74,
    labelDx: 18,
    labelDy: -18,
    anchor: 'start',
  },
  {
    id: 'maan',
    label: "Ma'an",
    x: 186,
    y: 398,
    tier: 'edge',
    score: 0.58,
    labelDx: 16,
    labelDy: -16,
    anchor: 'start',
  },
  {
    id: 'tafileh',
    label: 'Tafilah',
    x: 228,
    y: 350,
    tier: 'edge',
    score: 0.63,
    labelDx: 14,
    labelDy: -16,
    anchor: 'start',
  },
  {
    id: 'karak',
    label: 'Karak',
    x: 262,
    y: 306,
    tier: 'relay',
    score: 0.7,
    labelDx: 18,
    labelDy: -18,
    anchor: 'start',
  },
  {
    id: 'madaba',
    label: 'Madaba',
    x: 334,
    y: 248,
    tier: 'edge',
    score: 0.67,
    labelDx: -18,
    labelDy: -16,
    anchor: 'end',
  },
  {
    id: 'salt',
    label: 'Salt',
    x: 324,
    y: 182,
    tier: 'edge',
    score: 0.66,
    labelDx: -16,
    labelDy: -16,
    anchor: 'end',
  },
  {
    id: 'amman',
    label: 'Amman',
    x: 406,
    y: 210,
    tier: 'hub',
    score: 0.98,
    labelDx: 0,
    labelDy: -28,
    anchor: 'middle',
  },
  {
    id: 'jerash',
    label: 'Jerash',
    x: 366,
    y: 132,
    tier: 'edge',
    score: 0.65,
    labelDx: 18,
    labelDy: -16,
    anchor: 'start',
  },
  {
    id: 'ajloun',
    label: 'Ajloun',
    x: 328,
    y: 92,
    tier: 'edge',
    score: 0.62,
    labelDx: -14,
    labelDy: -16,
    anchor: 'end',
  },
  {
    id: 'irbid',
    label: 'Irbid',
    x: 278,
    y: 74,
    tier: 'relay',
    score: 0.78,
    labelDx: -14,
    labelDy: -16,
    anchor: 'end',
  },
  {
    id: 'zarqa',
    label: 'Zarqa',
    x: 482,
    y: 190,
    tier: 'relay',
    score: 0.81,
    labelDx: 18,
    labelDy: -18,
    anchor: 'start',
  },
  {
    id: 'mafraq',
    label: 'Mafraq',
    x: 562,
    y: 120,
    tier: 'edge',
    score: 0.69,
    labelDx: 18,
    labelDy: -16,
    anchor: 'start',
  },
  {
    id: 'azraq',
    label: 'Azraq',
    x: 644,
    y: 182,
    tier: 'edge',
    score: 0.57,
    labelDx: 18,
    labelDy: 18,
    anchor: 'start',
  },
];

const NETWORK_CITY_MAP = new Map<string, NetworkCity>(
  NETWORK_CITIES.map(city => [city.id, city]),
);

const NETWORK_ROUTES: NetworkRoute[] = [
  {
    id: 'aqaba-amman-express',
    from: 'aqaba',
    to: 'amman',
    curvature: -56,
    width: 6.6,
    kind: 'primary',
    duration: 8.8,
    delay: 1.4,
    tag: 'Express spine',
    labelT: 0.48,
  },
  {
    id: 'aqaba-karak',
    from: 'aqaba',
    to: 'karak',
    curvature: -28,
    width: 4.9,
    kind: 'primary',
    duration: 7.4,
    delay: 0.8,
  },
  {
    id: 'maan-aqaba',
    from: 'maan',
    to: 'aqaba',
    curvature: 14,
    width: 3,
    kind: 'secondary',
    duration: 6.8,
    delay: 2.6,
  },
  {
    id: 'maan-karak',
    from: 'maan',
    to: 'karak',
    curvature: 14,
    width: 3.4,
    kind: 'secondary',
    duration: 7.1,
    delay: 1.8,
  },
  {
    id: 'tafileh-karak',
    from: 'tafileh',
    to: 'karak',
    curvature: 10,
    width: 2.8,
    kind: 'secondary',
    duration: 6.4,
    delay: 2.4,
  },
  {
    id: 'karak-amman',
    from: 'karak',
    to: 'amman',
    curvature: -18,
    width: 5.4,
    kind: 'primary',
    duration: 7.2,
    delay: 0.4,
  },
  {
    id: 'karak-madaba',
    from: 'karak',
    to: 'madaba',
    curvature: -12,
    width: 3,
    kind: 'secondary',
    duration: 6.2,
    delay: 2.2,
  },
  {
    id: 'madaba-amman',
    from: 'madaba',
    to: 'amman',
    curvature: 16,
    width: 4.6,
    kind: 'primary',
    duration: 5.8,
    delay: 1.1,
  },
  {
    id: 'salt-amman',
    from: 'salt',
    to: 'amman',
    curvature: 18,
    width: 4.2,
    kind: 'primary',
    duration: 5.6,
    delay: 1.6,
  },
  {
    id: 'jerash-amman',
    from: 'jerash',
    to: 'amman',
    curvature: 18,
    width: 4.3,
    kind: 'primary',
    duration: 5.7,
    delay: 0.9,
  },
  {
    id: 'salt-jerash',
    from: 'salt',
    to: 'jerash',
    curvature: -18,
    width: 2.9,
    kind: 'secondary',
    duration: 6.3,
    delay: 2.9,
  },
  {
    id: 'irbid-ajloun',
    from: 'irbid',
    to: 'ajloun',
    curvature: 10,
    width: 2.8,
    kind: 'secondary',
    duration: 5.8,
    delay: 1.9,
  },
  {
    id: 'irbid-jerash',
    from: 'irbid',
    to: 'jerash',
    curvature: -12,
    width: 4.2,
    kind: 'primary',
    duration: 6.1,
    delay: 0.7,
    tag: 'North arc',
    labelT: 0.46,
  },
  {
    id: 'irbid-amman',
    from: 'irbid',
    to: 'amman',
    curvature: 34,
    width: 3.6,
    kind: 'secondary',
    duration: 7.4,
    delay: 2,
  },
  {
    id: 'amman-zarqa',
    from: 'amman',
    to: 'zarqa',
    curvature: 14,
    width: 5.8,
    kind: 'primary',
    duration: 5.2,
    delay: 0.3,
    tag: 'Core transfer',
    labelT: 0.54,
  },
  {
    id: 'amman-mafraq',
    from: 'amman',
    to: 'mafraq',
    curvature: -34,
    width: 3.5,
    kind: 'secondary',
    duration: 6.4,
    delay: 1.2,
  },
  {
    id: 'zarqa-mafraq',
    from: 'zarqa',
    to: 'mafraq',
    curvature: -18,
    width: 4.5,
    kind: 'primary',
    duration: 5.6,
    delay: 0.5,
  },
  {
    id: 'zarqa-azraq',
    from: 'zarqa',
    to: 'azraq',
    curvature: -10,
    width: 3.1,
    kind: 'secondary',
    duration: 6,
    delay: 2.1,
  },
  {
    id: 'azraq-amman',
    from: 'azraq',
    to: 'amman',
    curvature: -30,
    width: 2.6,
    kind: 'package',
    duration: 7.8,
    delay: 2.5,
  },
  {
    id: 'irbid-mafraq',
    from: 'irbid',
    to: 'mafraq',
    curvature: -18,
    width: 2.2,
    kind: 'package',
    duration: 7.3,
    delay: 2.8,
  },
  {
    id: 'madaba-zarqa',
    from: 'madaba',
    to: 'zarqa',
    curvature: 22,
    width: 2.3,
    kind: 'package',
    duration: 6.8,
    delay: 1.7,
  },
  {
    id: 'karak-zarqa',
    from: 'karak',
    to: 'zarqa',
    curvature: 34,
    width: 2.2,
    kind: 'package',
    duration: 7.5,
    delay: 3.2,
  },
  {
    id: 'aqaba-zarqa',
    from: 'aqaba',
    to: 'zarqa',
    curvature: 76,
    width: 2.4,
    kind: 'package',
    duration: 8.2,
    delay: 2.3,
  },
  {
    id: 'aqaba-ajloun',
    from: 'aqaba',
    to: 'ajloun',
    curvature: 84,
    width: 2.1,
    kind: 'package',
    duration: 8.9,
    delay: 3.6,
  },
];

function getCity(id: string): NetworkCity {
  const city = NETWORK_CITY_MAP.get(id);

  if (!city) {
    throw new Error(`Unknown network city "${id}"`);
  }

  return city;
}

function getControlPoint(start: Point, end: Point, curvature: number): Point {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const normalX = -dy / length;
  const normalY = dx / length;

  return {
    x: (start.x + end.x) / 2 + normalX * curvature,
    y: (start.y + end.y) / 2 + normalY * curvature,
  };
}

function buildQuadraticPath(start: Point, end: Point, curvature: number): string {
  const control = getControlPoint(start, end, curvature);
  return `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`;
}

function getQuadraticPoint(start: Point, end: Point, curvature: number, t = 0.5): Point {
  const control = getControlPoint(start, end, curvature);
  const inverse = 1 - t;

  return {
    x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
    y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y,
  };
}

const FIELD_BANDS = [
  {
    id: 'southern-spine',
    path: buildQuadraticPath(getCity('aqaba'), getCity('amman'), -56),
    width: 74,
    kind: 'primary' as const,
  },
  {
    id: 'northern-ring',
    path: buildQuadraticPath(getCity('irbid'), getCity('zarqa'), 28),
    width: 46,
    kind: 'secondary' as const,
  },
  {
    id: 'package-lattice',
    path: buildQuadraticPath(getCity('aqaba'), getCity('mafraq'), 82),
    width: 54,
    kind: 'package' as const,
  },
];

const ROUTE_MODELS = NETWORK_ROUTES.map(route => {
  const from = getCity(route.from);
  const to = getCity(route.to);
  const labelPoint = getQuadraticPoint(from, to, route.curvature, route.labelT ?? 0.5);

  return {
    ...route,
    path: buildQuadraticPath(from, to, route.curvature),
    labelPoint,
  };
});

const LEGEND_ITEMS = [
  { label: 'Passenger spine', kind: 'primary' as const },
  { label: 'Adaptive relay', kind: 'secondary' as const },
  { label: 'Parcel lattice', kind: 'package' as const },
] as const;

const HUD_STATS = [
  { value: '12', label: 'cities mapped' },
  { value: '27', label: 'weighted lanes' },
  { value: '24/7', label: 'rebalancing' },
] as const;

export function WaselAuthNetworkMap() {
  const id = useId().replace(/:/g, '');
  const minorGridId = `${id}-minor-grid`;
  const majorGridId = `${id}-major-grid`;
  const haloGradientId = `${id}-halo-gradient`;
  const primaryBandGradientId = `${id}-band-primary`;
  const secondaryBandGradientId = `${id}-band-secondary`;
  const packageBandGradientId = `${id}-band-package`;
  const softGlowId = `${id}-soft-glow`;

  return (
    <div className="auth-network-map" aria-hidden="true">
      <svg
        className="auth-network-map__svg"
        viewBox={`0 0 ${VIEW_BOX_WIDTH} ${VIEW_BOX_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <pattern
            id={minorGridId}
            width="28"
            height="28"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(2)"
          >
            <path className="auth-network-map__grid-line auth-network-map__grid-line--minor" d="M 28 0 L 0 0 0 28" />
          </pattern>
          <pattern id={majorGridId} width="112" height="112" patternUnits="userSpaceOnUse">
            <path className="auth-network-map__grid-line auth-network-map__grid-line--major" d="M 112 0 L 0 0 0 112" />
          </pattern>

          <radialGradient id={haloGradientId} cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="rgb(var(--accent-secondary-rgb) / 0.28)" />
            <stop offset="55%" stopColor="rgb(var(--accent-rgb) / 0.18)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          <linearGradient id={primaryBandGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(var(--accent-secondary-rgb) / 0.01)" />
            <stop offset="45%" stopColor="rgb(var(--accent-secondary-rgb) / 0.28)" />
            <stop offset="100%" stopColor="rgb(var(--accent-secondary-rgb) / 0.03)" />
          </linearGradient>

          <linearGradient id={secondaryBandGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(var(--accent-rgb) / 0.01)" />
            <stop offset="50%" stopColor="rgb(var(--accent-rgb) / 0.22)" />
            <stop offset="100%" stopColor="rgb(var(--accent-rgb) / 0.03)" />
          </linearGradient>

          <linearGradient id={packageBandGradientId} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgb(var(--warning-rgb, 245 154 44) / 0.01)" />
            <stop offset="45%" stopColor="rgb(var(--warning-rgb, 245 154 44) / 0.2)" />
            <stop offset="100%" stopColor="rgb(var(--warning-rgb, 245 154 44) / 0.02)" />
          </linearGradient>

          <filter id={softGlowId} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>

        <rect width={VIEW_BOX_WIDTH} height={VIEW_BOX_HEIGHT} fill={`url(#${minorGridId})`} />
        <rect width={VIEW_BOX_WIDTH} height={VIEW_BOX_HEIGHT} fill={`url(#${majorGridId})`} />
        <rect
          x="124"
          y="54"
          width="530"
          height="360"
          rx="180"
          fill={`url(#${haloGradientId})`}
          opacity="0.72"
        />

        <g className="auth-network-map__field">
          <ellipse className="auth-network-map__field-ring" cx="398" cy="212" rx="244" ry="154" />
          <ellipse className="auth-network-map__field-ring auth-network-map__field-ring--wide" cx="398" cy="212" rx="296" ry="194" />
          <ellipse className="auth-network-map__field-ring auth-network-map__field-ring--tilted" cx="270" cy="346" rx="188" ry="76" />
          <path className="auth-network-map__axis" d="M 92 458 L 658 74" />
          <path className="auth-network-map__axis" d="M 94 88 L 684 362" />
          <path className="auth-network-map__axis auth-network-map__axis--soft" d="M 188 470 L 636 118" />
        </g>

        <g className="auth-network-map__bands">
          {FIELD_BANDS.map(band => (
            <path
              key={band.id}
              d={band.path}
              className={`auth-network-map__band auth-network-map__band--${band.kind}`}
              strokeWidth={band.width}
              stroke={
                band.kind === 'primary'
                  ? `url(#${primaryBandGradientId})`
                  : band.kind === 'secondary'
                    ? `url(#${secondaryBandGradientId})`
                    : `url(#${packageBandGradientId})`
              }
            />
          ))}
        </g>

        <g className="auth-network-map__routes">
          {ROUTE_MODELS.map(route => (
            <g key={route.id}>
              <path
                d={route.path}
                className={`auth-network-map__route-glow auth-network-map__route-glow--${route.kind}`}
                strokeWidth={route.width + 4}
                filter={`url(#${softGlowId})`}
              />
              <path
                d={route.path}
                className={`auth-network-map__route auth-network-map__route--${route.kind}`}
                strokeWidth={route.width}
              />
              <path
                d={route.path}
                className={`auth-network-map__route-flow auth-network-map__route-flow--${route.kind}`}
                strokeWidth={route.width + 0.8}
                strokeDasharray={
                  route.kind === 'primary' ? '18 22' : route.kind === 'secondary' ? '12 16' : '6 12'
                }
                style={{
                  animationDuration: `${route.duration}s`,
                  animationDelay: `-${route.delay}s`,
                }}
              />

              {route.tag ? (
                <g
                  className="auth-network-map__route-tag"
                  transform={`translate(${route.labelPoint.x} ${route.labelPoint.y})`}
                >
                  <rect
                    x={-(route.tag.length * 3.4 + 16)}
                    y="-13"
                    width={route.tag.length * 6.8 + 32}
                    height="26"
                    rx="13"
                  />
                  <text y="4" textAnchor="middle">
                    {route.tag}
                  </text>
                </g>
              ) : null}
            </g>
          ))}
        </g>

        <g className="auth-network-map__nodes">
          {NETWORK_CITIES.map(city => {
            const haloRadius = city.tier === 'hub' ? 28 : city.tier === 'relay' ? 20 : 15;
            const ringRadius = city.tier === 'hub' ? 14 : city.tier === 'relay' ? 10 : 8;
            const coreRadius = city.tier === 'hub' ? 6 : city.tier === 'relay' ? 5 : 4;

            return (
              <g key={city.id}>
                <g transform={`translate(${city.x} ${city.y})`}>
                  <circle className={`auth-network-map__node-halo auth-network-map__node-halo--${city.tier}`} r={haloRadius} />
                  <circle className={`auth-network-map__node-ring auth-network-map__node-ring--${city.tier}`} r={ringRadius} />
                  <circle className={`auth-network-map__node-core auth-network-map__node-core--${city.tier}`} r={coreRadius} />
                  <circle className="auth-network-map__node-center" r="1.8" />
                </g>

                <g
                  className="auth-network-map__city-label"
                  transform={`translate(${city.x + city.labelDx} ${city.y + city.labelDy})`}
                >
                  <text textAnchor={city.anchor ?? 'start'} className="auth-network-map__city-name">
                    {city.label}
                  </text>
                  <text
                    textAnchor={city.anchor ?? 'start'}
                    className="auth-network-map__city-meta"
                    dy="15"
                  >
                    {`${city.tier} ${city.score.toFixed(2)}`}
                  </text>
                </g>
              </g>
            );
          })}
        </g>
      </svg>

      <div className="auth-network-map__hud">
        <div className="auth-network-map__hud-kicker">Route field</div>
        <div className="auth-network-map__hud-title">Jordan corridor graph</div>
        <div className="auth-network-map__hud-note">
          Live passenger spine, parcel lattice, and rebalance-aware relays rendered as one continuous network.
        </div>
        <div className="auth-network-map__hud-stats">
          {HUD_STATS.map(stat => (
            <div key={stat.label} className="auth-network-map__hud-stat">
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="auth-network-map__legend">
        {LEGEND_ITEMS.map(item => (
          <div key={item.label} className="auth-network-map__legend-item">
            <span className={`auth-network-map__legend-swatch auth-network-map__legend-swatch--${item.kind}`} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

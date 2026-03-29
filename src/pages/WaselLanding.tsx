import { useEffect, useState } from 'react';
import { ArrowRight, Bus, MapPinned, Package, Route, ShieldCheck, Sparkles, Ticket } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { useLocalAuth } from '../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../hooks/useIframeSafeNavigate';
import { getConnectedStats } from '../services/journeyLogistics';
import { buildInnovationSnapshot, getJordanLaunchRoutes, type InnovationSnapshot } from '../services/innovationNetwork';

export default function WaselLanding() {
  const nav = useIframeSafeNavigate();
  const { user } = useLocalAuth();
  const [snapshot, setSnapshot] = useState<InnovationSnapshot | null>(null);
  const [networkStats, setNetworkStats] = useState(() => getConnectedStats());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const nextSnapshot = await buildInnovationSnapshot();
      if (cancelled) return;
      setSnapshot(nextSnapshot);
      setNetworkStats(getConnectedStats());
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const launchRoutes = getJordanLaunchRoutes().slice(0, 6);
  const serviceCards = [
    {
      title: 'Find Ride',
      description: 'Search active seats across Jordan corridor routes with pricing, filters, and instant booking.',
      icon: Route,
      cta: 'Browse rides',
      path: '/app/find-ride',
      tone: 'border-cyan-500/20 bg-cyan-500/5',
    },
    {
      title: 'Offer Ride',
      description: 'Post your route, expose spare seats, and make your trip discoverable to the network.',
      icon: MapPinned,
      cta: 'Post a ride',
      path: '/app/offer-ride',
      tone: 'border-sky-500/20 bg-sky-500/5',
    },
    {
      title: 'Packages',
      description: 'Send and track route-linked deliveries with escrow-backed status updates.',
      icon: Package,
      cta: 'Open packages',
      path: '/app/packages',
      tone: 'border-amber-500/20 bg-amber-500/5',
    },
    {
      title: 'Raje3 Returns',
      description: 'Turn reverse logistics into a lighter-weight return flow built on scheduled rides.',
      icon: ShieldCheck,
      cta: 'Start a return',
      path: '/app/raje3',
      tone: 'border-emerald-500/20 bg-emerald-500/5',
    },
    {
      title: 'Bus',
      description: 'Book fixed-price intercity coaches when a predictable scheduled trip is the right fit.',
      icon: Bus,
      cta: 'See bus routes',
      path: '/app/bus',
      tone: 'border-white/10 bg-white/[0.03]',
    },
  ];

  return (
    <div className="min-h-screen bg-[#040C18] text-slate-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-12 px-4 py-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[32px] border border-cyan-500/20 bg-[radial-gradient(circle_at_top_left,_rgba(0,200,232,0.18),_transparent_32%),linear-gradient(135deg,_#081527,_#040C18_55%,_#0b1d45)] p-8 shadow-2xl shadow-cyan-950/20 md:p-12">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-6">
              <Badge className="border-cyan-400/30 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/10">
                Intercity rides, packages, returns, and bus in one Jordan-first app
              </Badge>
              <div className="space-y-4">
                <h1 className="max-w-4xl text-4xl font-semibold leading-tight tracking-tight text-white md:text-6xl">
                  Move people and packages through the same corridor network.
                </h1>
                <p className="max-w-3xl text-base leading-7 text-slate-300 md:text-lg">
                  Wasel is now focused on the journeys users actually need every day: finding rides, offering seats,
                  sending packages, handling returns, and booking intercity bus trips without product sprawl.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  size="lg"
                  className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                  onClick={() => nav(user ? '/app/dashboard' : '/app/auth?tab=register')}
                >
                  {user ? 'Open Dashboard' : 'Create Account'}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                  onClick={() => nav('/app/find-ride')}
                >
                  Explore rides
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Card className="border-white/10 bg-white/5 text-white">
                  <CardContent className="pt-6">
                    <div className="text-sm text-slate-400">Launch corridors</div>
                    <div className="mt-2 text-3xl font-semibold">{launchRoutes.length}</div>
                  </CardContent>
                </Card>
                <Card className="border-white/10 bg-white/5 text-white">
                  <CardContent className="pt-6">
                    <div className="text-sm text-slate-400">Rides posted</div>
                    <div className="mt-2 text-3xl font-semibold">{networkStats.ridesPosted}</div>
                  </CardContent>
                </Card>
                <Card className="border-white/10 bg-white/5 text-white">
                  <CardContent className="pt-6">
                    <div className="text-sm text-slate-400">Packages created</div>
                    <div className="mt-2 text-3xl font-semibold">{networkStats.packagesCreated}</div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Card className="border-cyan-500/20 bg-slate-950/50 text-slate-50">
              <CardHeader>
                <CardTitle>Why this version is sharper</CardTitle>
                <CardDescription className="text-slate-400">
                  The product now tells one clear story instead of stretching across too many verticals.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    title: 'Rides come first',
                    detail: 'Ride discovery and ride supply are now the center of the user journey.',
                    icon: Route,
                  },
                  {
                    title: 'Packages connect to routes',
                    detail: 'Package lanes stay tied to real route demand instead of feeling like a separate app.',
                    icon: Package,
                  },
                  {
                    title: 'Returns stay lightweight',
                    detail: 'Raje3 extends the ride network with reverse logistics instead of introducing product clutter.',
                    icon: Sparkles,
                  },
                  {
                    title: 'Bus stays predictable',
                    detail: 'Scheduled intercity coach booking remains available when users want fixed timing and fixed price.',
                    icon: Ticket,
                  },
                ].map((item) => (
                  <div key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-2 text-cyan-200">
                        <item.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-medium text-white">{item.title}</div>
                        <div className="mt-1 text-sm leading-6 text-slate-400">{item.detail}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-5">
          <div className="space-y-2">
            <Badge className="border-emerald-400/30 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/10">
              Core Services
            </Badge>
            <h2 className="text-3xl font-semibold tracking-tight text-white">Everything on the landing page now points to a real user job.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {serviceCards.map((item) => (
              <Card key={item.title} className={`${item.tone} text-white`}>
                <CardHeader>
                  <div className="mb-3 w-fit rounded-xl border border-white/10 bg-white/10 p-2 text-cyan-100">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription className="text-slate-300">{item.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                    onClick={() => nav(item.path)}
                  >
                    {item.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-5">
          <div className="space-y-2">
            <Badge className="border-amber-400/30 bg-amber-400/10 text-amber-100 hover:bg-amber-400/10">
              Jordan Corridors
            </Badge>
            <h2 className="text-3xl font-semibold tracking-tight text-white">Launch routes should help users decide quickly.</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {launchRoutes.map((route) => (
              <Card key={route.id} className="border-white/10 bg-white/[0.03] text-white">
                <CardHeader>
                  <CardTitle>{route.from} to {route.to}</CardTitle>
                  <CardDescription className="text-slate-400">
                    {route.useCase} • {route.distanceKm} km • {route.durationMin} min
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-300">
                  <div className="flex items-center justify-between">
                    <span>Packages</span>
                    <span>{route.packageEnabled ? 'Enabled' : 'No'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Tier</span>
                    <span>{route.tier}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Typical use</span>
                    <span>{route.useCase}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="border-cyan-500/20 bg-cyan-500/5 text-white">
            <CardHeader>
              <CardTitle>Corridor health</CardTitle>
              <CardDescription className="text-slate-400">
                A single view of route readiness keeps search, posting, and package demand aligned.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-300">
              <div>Health score: {snapshot?.liquidity.healthScore ?? '...'}/100</div>
              <div>Prayer-aware stops: {snapshot?.prayerStops.length ?? 0}</div>
              <div>Passenger matches: {snapshot?.passengerMatches.length ?? 0}</div>
            </CardContent>
          </Card>

          <Card className="border-amber-500/20 bg-amber-500/5 text-white">
            <CardHeader>
              <CardTitle>Package protection</CardTitle>
              <CardDescription className="text-slate-400">
                Packages still benefit from tracking, insurance, and escrow-backed status updates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-300">
              <div>Tracking code: {snapshot?.packageOps.tracking.trackingCode ?? 'Loading...'}</div>
              <div>Insured value: JOD {snapshot?.packageOps.insuredValueJOD ?? '...'}</div>
              <div>Escrow: {snapshot?.packageOps.escrow.heldInEscrow ? 'Protected' : 'Pending'}</div>
            </CardContent>
          </Card>

          <Card className="border-emerald-500/20 bg-emerald-500/5 text-white">
            <CardHeader>
              <CardTitle>Connected network</CardTitle>
              <CardDescription className="text-slate-400">
                Offer Ride, Packages, and Raje3 all get stronger when they share the same route inventory.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-300">
              <div>Package-ready rides: {networkStats.packageEnabledRides}</div>
              <div>Matched packages: {networkStats.matchedPackages}</div>
              <div>Shared route inventory: active</div>
            </CardContent>
          </Card>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-8 text-center shadow-xl shadow-black/20">
          <div className="mx-auto max-w-3xl space-y-4">
            <Badge className="border-white/10 bg-white/5 text-white hover:bg-white/5">
              Focused Product Scope
            </Badge>
            <h2 className="text-3xl font-semibold tracking-tight text-white">
              The product is cleaner when every action leads to rides, packages, returns, or bus.
            </h2>
            <p className="text-base leading-7 text-slate-400">
              This landing page now reinforces one story everywhere: Wasel helps users move through Jordan with a
              smaller, sharper product surface and clearer next steps.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Button className="bg-cyan-400 text-slate-950 hover:bg-cyan-300" onClick={() => nav('/app/dashboard')}>
                Open Dashboard
              </Button>
              <Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={() => nav('/app/packages')}>
                Open Packages
              </Button>
              <Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={() => nav('/app/bus')}>
                Open Bus
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { ArrowRight, BadgeCheck, Bus, Package, Route, ShieldCheck, Ticket, TrendingUp } from 'lucide-react';
import { useIframeSafeNavigate } from '../hooks/useIframeSafeNavigate';
import { useLocalAuth } from '../contexts/LocalAuth';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { getConnectedPackages, getConnectedRides, getConnectedStats } from '../services/journeyLogistics';
import { buildInnovationSnapshot, type InnovationSnapshot } from '../services/innovationNetwork';
import { CurrencyService } from '../utils/currency';

export default function WaselDashboard() {
  const nav = useIframeSafeNavigate();
  const { user } = useLocalAuth();
  const [snapshot, setSnapshot] = useState<InnovationSnapshot | null>(null);
  const [networkStats, setNetworkStats] = useState(() => getConnectedStats());

  useEffect(() => {
    if (!user) {
      nav('/app/auth');
      return;
    }

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
  }, [nav, user]);

  if (!user) {
    return null;
  }

  const currency = CurrencyService.getInstance();
  const postedRides = getConnectedRides().slice(0, 3);
  const recentPackages = getConnectedPackages().slice(0, 3);
  const quickActions = [
    { label: 'Find Ride', path: '/app/find-ride', icon: Route, color: 'text-cyan-300', note: 'Search live corridor rides.' },
    { label: 'Offer Ride', path: '/app/offer-ride', icon: TrendingUp, color: 'text-sky-300', note: 'Publish new seats into the network.' },
    { label: 'Packages', path: '/app/packages', icon: Package, color: 'text-amber-300', note: 'Create and track deliveries.' },
    { label: 'Raje3 Returns', path: '/app/raje3', icon: ShieldCheck, color: 'text-emerald-300', note: 'Start a reverse-logistics request.' },
    { label: 'Bus', path: '/app/bus', icon: Bus, color: 'text-white', note: 'Book scheduled fixed-price coaches.' },
    { label: 'Wallet', path: '/app/wallet', icon: Ticket, color: 'text-cyan-200', note: 'Check balances, escrow, and payments.' },
  ];

  return (
    <div className="min-h-screen bg-[#040C18] text-slate-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[30px] border border-cyan-500/20 bg-[radial-gradient(circle_at_top_right,_rgba(0,200,232,0.16),_transparent_28%),linear-gradient(135deg,_#091526,_#040C18_55%,_#0b1d45)] p-8 shadow-2xl shadow-cyan-950/20">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <Badge className="w-fit border-cyan-400/30 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/10">
                Wasel Command Center
              </Badge>
              <div className="space-y-2">
                <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
                  {user.name}, everything important is now one tap away.
                </h1>
                <p className="max-w-3xl text-base leading-7 text-slate-300">
                  This dashboard is focused on the core product set only: ride discovery, ride supply, packages,
                  returns, bus, and wallet state.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button className="bg-cyan-400 text-slate-950 hover:bg-cyan-300" onClick={() => nav('/app/find-ride')}>
                Find a Ride
              </Button>
              <Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={() => nav('/app/offer-ride')}>
                Offer a Ride
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-white/10 bg-white/[0.03] text-white">
            <CardContent className="pt-6">
              <div className="text-sm text-slate-400">Corridor health</div>
              <div className="mt-2 text-3xl font-semibold">{snapshot?.liquidity.healthScore ?? '...'}/100</div>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-white/[0.03] text-white">
            <CardContent className="pt-6">
              <div className="text-sm text-slate-400">Rides posted</div>
              <div className="mt-2 text-3xl font-semibold">{networkStats.ridesPosted}</div>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-white/[0.03] text-white">
            <CardContent className="pt-6">
              <div className="text-sm text-slate-400">Packages created</div>
              <div className="mt-2 text-3xl font-semibold">{networkStats.packagesCreated}</div>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-white/[0.03] text-white">
            <CardContent className="pt-6">
              <div className="text-sm text-slate-400">Protected escrow</div>
              <div className="mt-2 text-3xl font-semibold">
                {snapshot ? currency.formatFromJOD(snapshot.packageOps.escrow.amount) : '...'}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="border-white/10 bg-white/[0.03] text-white">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription className="text-slate-400">
                The main journeys are visible, direct, and no longer mixed with removed product areas.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => nav(action.path)}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-cyan-400/30 hover:bg-white/[0.05]"
                >
                  <action.icon className={`mb-3 h-5 w-5 ${action.color}`} />
                  <div className="font-medium text-white">{action.label}</div>
                  <div className="mt-1 text-sm text-slate-400">{action.note}</div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03] text-white">
            <CardHeader>
              <CardTitle>Operating Thesis</CardTitle>
              <CardDescription className="text-slate-400">
                The retained app now reinforces a smaller and clearer story everywhere.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-slate-300">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                Find Ride and Offer Ride anchor the marketplace and keep supply and demand in one place.
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                Packages and Raje3 ride on top of route inventory so logistics feels connected, not duplicated.
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                Bus stays as the scheduled, fixed-price option for users who prefer certainty over seat matching.
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="border-cyan-500/20 bg-cyan-500/5 text-white">
            <CardHeader>
              <CardTitle>Ride network</CardTitle>
              <CardDescription className="text-slate-400">
                Posted rides should immediately strengthen the search experience.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-300">
              <div>Package-ready rides: {networkStats.packageEnabledRides}</div>
              <div>Recent postings: {postedRides.length}</div>
              <div>Passenger matches: {snapshot?.passengerMatches.length ?? 0}</div>
            </CardContent>
          </Card>

          <Card className="border-amber-500/20 bg-amber-500/5 text-white">
            <CardHeader>
              <CardTitle>Package network</CardTitle>
              <CardDescription className="text-slate-400">
                Packages and returns now sit much closer to the core ride flow.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-300">
              <div>Packages created: {networkStats.packagesCreated}</div>
              <div>Matched packages: {networkStats.matchedPackages}</div>
              <div>Recent package records: {recentPackages.length}</div>
            </CardContent>
          </Card>

          <Card className="border-emerald-500/20 bg-emerald-500/5 text-white">
            <CardHeader>
              <CardTitle>Route timing</CardTitle>
              <CardDescription className="text-slate-400">
                Timing, route quality, and predictable mobility still matter across every service.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-300">
              <div>Prayer stop suggestions: {snapshot?.prayerStops.length ?? 0}</div>
              <div>Best seat price: {snapshot ? currency.formatFromJOD(snapshot.seatYield[snapshot.seatYield.length - 1]?.price ?? 0) : '...'}</div>
              <div>Bus mode: ready for scheduled intercity booking</div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="border-white/10 bg-white/[0.03] text-white">
            <CardHeader>
              <CardTitle>Recent route inventory</CardTitle>
              <CardDescription className="text-slate-400">
                The dashboard should help you see whether the network already has fresh supply.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {postedRides.length > 0 ? postedRides.map((ride) => (
                <div key={ride.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-white">{ride.from} to {ride.to}</div>
                      <div className="mt-1 text-sm text-slate-400">
                        {ride.date || 'Date pending'} • {ride.time || 'Time pending'} • {ride.seats} seats
                      </div>
                    </div>
                    <Badge variant="outline" className="border-cyan-400/20 bg-cyan-400/10 text-cyan-100">
                      JOD {ride.price}
                    </Badge>
                  </div>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-sm text-slate-400">
                  No rides posted yet. Add your first corridor ride to make search results stronger immediately.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03] text-white">
            <CardHeader>
              <CardTitle>Execution Standard</CardTitle>
              <CardDescription className="text-slate-400">
                The dashboard reaches 10/10 when every primary action is obvious and useful.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-300">
              {[
                'Keep the main services visible in navigation and remove dead-end branches.',
                'Let posted rides flow back into Find Ride so supply feels live.',
                'Make packages, returns, and bus feel like extensions of the same route network.',
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <BadgeCheck className="mt-0.5 h-4 w-4 text-emerald-400" />
                  <span>{item}</span>
                </div>
              ))}
              <Button className="w-full bg-cyan-400 text-slate-950 hover:bg-cyan-300" onClick={() => nav('/app/packages')}>
                Open Package Network
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}

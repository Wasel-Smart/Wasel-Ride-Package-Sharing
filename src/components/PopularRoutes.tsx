import {
  ArrowUpRight,
  CircleDollarSign,
  MapPin,
  MoveRight,
  Route as RouteIcon,
  Sparkles,
  Timer,
  TrendingUp,
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { useLanguage } from '../contexts/LanguageContext';
import { useIframeSafeNavigate } from '../hooks/useIframeSafeNavigate';
import {
  getAllCities,
  getPopularRoutes,
  JORDAN_MOBILITY_NETWORK,
  type JordanRoute,
} from '../config/jordan-mobility-network';

interface PopularRoutesProps {
  onGetStarted?: () => void;
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function demandLabel(route: JordanRoute, isRTL: boolean) {
  if (route.popularity === 'high') return isRTL ? 'طلب مرتفع' : 'High demand';
  if (route.popularity === 'medium') return isRTL ? 'طلب متوازن' : 'Balanced demand';
  return isRTL ? 'طلب ناشئ' : 'Emerging demand';
}

function categoryLabel(route: JordanRoute, isRTL: boolean) {
  if (route.category === 'intercity') return isRTL ? 'بين المدن' : 'Intercity';
  if (route.category === 'regional') return isRTL ? 'إقليمي' : 'Regional';
  return isRTL ? 'محلي' : 'Local';
}

export function PopularRoutes({ onGetStarted }: PopularRoutesProps) {
  const { language } = useLanguage();
  const navigate = useIframeSafeNavigate();
  const isRTL = language === 'ar';
  const popularRoutes = getPopularRoutes();
  const connectedCities = getAllCities().length;
  const publishedCorridors = JORDAN_MOBILITY_NETWORK.length;
  const intercityCount = JORDAN_MOBILITY_NETWORK.filter(
    route => route.category === 'intercity',
  ).length;
  const handleGetStarted = onGetStarted ?? (() => navigate('/app/find-ride'));

  const openRoute = (route: JordanRoute) =>
    navigate(
      `/app/find-ride?from=${encodeURIComponent(route.origin)}&to=${encodeURIComponent(route.destination)}&search=1`,
    );

  const openSupply = (route?: JordanRoute) => {
    if (!route) {
      navigate('/app/offer-ride');
      return;
    }

    navigate(
      `/app/offer-ride?from=${encodeURIComponent(route.origin)}&to=${encodeURIComponent(route.destination)}`,
    );
  };

  return (
    <section className="py-20 bg-muted">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <TrendingUp className="w-8 h-8 text-primary" />
            <Badge className="bg-primary/10 text-primary border-primary/20">
              {isRTL ? 'أعلى المسارات طلباً' : 'Highest-demand corridors'}
            </Badge>
          </div>
          <h2 className="mb-4">
            {isRTL ? 'المسارات الأعلى طلباً عبر الأردن' : "Jordan's highest-demand corridors"}
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {isRTL
              ? 'هذه الصفحة مبنية على مخطط شبكة واصل الأردنية الفعلي. افتح أي ممر لرؤية السعر الأساسي، زمن الرحلة، ونوع الحركة على هذا الخط.'
              : "This page is grounded in Wasel's actual Jordan mobility network. Open any corridor to see the base fare, trip duration, and the type of movement that lane supports."}
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <Card className="border-primary/10">
            <CardContent className="p-6 text-center">
              <div className="text-3xl text-primary mb-2">{connectedCities}</div>
              <p className="text-sm text-muted-foreground">
                {isRTL ? 'مدن متصلة' : 'Connected cities'}
              </p>
            </CardContent>
          </Card>
          <Card className="border-primary/10">
            <CardContent className="p-6 text-center">
              <div className="text-3xl text-primary mb-2">{publishedCorridors}</div>
              <p className="text-sm text-muted-foreground">
                {isRTL ? 'ممرات منشورة' : 'Published corridors'}
              </p>
            </CardContent>
          </Card>
          <Card className="border-primary/10">
            <CardContent className="p-6 text-center">
              <div className="text-3xl text-primary mb-2">{popularRoutes.length}</div>
              <p className="text-sm text-muted-foreground">
                {isRTL ? 'مسارات بطلب مرتفع' : 'High-demand lanes'}
              </p>
            </CardContent>
          </Card>
          <Card className="border-primary/10">
            <CardContent className="p-6 text-center">
              <div className="text-3xl text-primary mb-2">{intercityCount}</div>
              <p className="text-sm text-muted-foreground">
                {isRTL ? 'خطوط بين المدن' : 'Intercity corridors'}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {popularRoutes.map(route => (
            <Card
              key={route.id}
              className="group relative overflow-hidden border-border transition-all duration-300 hover:border-primary/30 hover:shadow-xl"
            >
              <div className="absolute top-0 left-0 bg-gradient-to-r from-accent to-accent/90 px-4 py-1 text-xs text-accent-foreground rounded-br-lg">
                {categoryLabel(route, isRTL)}
              </div>

              <div className="absolute top-0 right-0 rounded-bl-lg bg-gradient-to-l from-primary to-primary/90 px-4 py-1 text-xs text-primary-foreground">
                {demandLabel(route, isRTL)}
              </div>

              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between gap-2 pt-4">
                  <Badge className="border-primary/20 bg-primary/10 text-primary">
                    <Sparkles className="mr-1 w-3 h-3" />
                    {isRTL ? 'من شبكة واصل' : 'From the Wasel network'}
                  </Badge>
                </div>

                <button
                  type="button"
                  onClick={() => openRoute(route)}
                  className="w-full text-left"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                  }}
                >
                  <div className="mb-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-foreground transition-colors group-hover:text-primary">
                          {route.origin}
                        </h3>
                        <p className="text-sm text-muted-foreground">{route.originAr}</p>
                      </div>
                      <MoveRight className="mx-3 h-6 w-6 flex-shrink-0 text-primary transition-transform group-hover:translate-x-1" />
                      <div className="min-w-0 flex-1 text-right">
                        <h3 className="text-foreground transition-colors group-hover:text-primary">
                          {route.destination}
                        </h3>
                        <p className="text-sm text-muted-foreground">{route.destinationAr}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CircleDollarSign className="h-4 w-4 text-primary" />
                        <span>{isRTL ? 'السعر الأساسي' : 'Base shared fare'}</span>
                      </div>
                      <span className="text-lg text-primary">{route.baseFare.toFixed(1)} JOD</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Timer className="h-4 w-4 text-primary" />
                        <span>{isRTL ? 'المدة المعتادة' : 'Typical duration'}</span>
                      </div>
                      <span className="text-foreground">{formatDuration(route.duration)}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span>{isRTL ? 'المسافة' : 'Distance'}</span>
                      </div>
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        {route.distance} km
                      </Badge>
                    </div>
                  </div>
                </button>

                <div className="border-t border-border pt-3">
                  <p className="text-center text-xs text-muted-foreground">
                    {isRTL
                      ? 'افتح هذا الممر لرؤية الرحلات الفعلية وخيار عرض رحلة على نفس الخط.'
                      : 'Open this corridor to see live rides and optionally supply your own route.'}
                  </p>
                </div>

                <div className="mt-4 grid gap-2">
                  <Button
                    onClick={() => openRoute(route)}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    size="sm"
                  >
                    {isRTL ? 'افتح هذا الممر' : 'Open this corridor'}
                    <ArrowUpRight className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => openSupply(route)}
                    variant="outline"
                    className="w-full border-primary/30 text-primary hover:bg-primary/5"
                    size="sm"
                  >
                    {isRTL ? 'اعرض رحلة على هذا الخط' : 'Offer this route'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="p-8">
              <h3 className="mb-3 text-foreground">
                {isRTL
                  ? 'ابدأ من الممر ثم اختر النمط'
                  : 'Start from the corridor, then choose the mode'}
              </h3>
              <p className="mx-auto mb-6 max-w-2xl text-muted-foreground">
                {isRTL
                  ? 'افتح أي مسار لترى إن كانت الرحلة المشتركة هي الأنسب الآن، أو انتقل إلى الباص أو الطرود أو عرض الرحلات من نفس الشبكة.'
                  : 'Open any corridor to see whether shared rides are the right fit now, or pivot into buses, parcels, or route supply from the same network.'}
              </p>
              <div className="flex flex-col justify-center gap-4 sm:flex-row">
                <Button
                  onClick={handleGetStarted}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  size="lg"
                >
                  {isRTL ? 'استكشف الرحلات الحية' : 'Explore live ride supply'}
                </Button>
                <Button
                  onClick={() => openSupply(popularRoutes[0])}
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary/5"
                  size="lg"
                >
                  {isRTL ? 'افتح عرض رحلة' : 'Open route supply'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <CircleDollarSign className="h-8 w-8 text-primary" />
            </div>
            <h4 className="mb-2">{isRTL ? 'سعر أساسي واضح' : 'Transparent base fare'}</h4>
            <p className="text-sm text-muted-foreground">
              {isRTL
                ? 'يعرض كل ممر سعره الأساسي من نفس شبكة واصل بدل أرقام تسويقية غير مرتبطة بالخط.'
                : 'Each corridor shows its configured shared fare from the actual Wasel route network instead of disconnected marketing numbers.'}
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <RouteIcon className="h-8 w-8 text-primary" />
            </div>
            <h4 className="mb-2">{isRTL ? 'ممرات واقعية' : 'Real corridor structure'}</h4>
            <p className="text-sm text-muted-foreground">
              {isRTL
                ? 'المسارات هنا مرتبطة بالمدن الفعلية، المسافة، الفئة، وزمن الرحلة داخل مخطط الأردن.'
                : 'These corridors stay tied to real origin-destination pairs, category, distance, and travel time inside the Jordan network model.'}
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <MapPin className="h-8 w-8 text-primary" />
            </div>
            <h4 className="mb-2">{isRTL ? 'فتح مباشر إلى الحجز' : 'Direct path into booking'}</h4>
            <p className="text-sm text-muted-foreground">
              {isRTL
                ? 'كل بطاقة تنقلك مباشرة إلى البحث عن الرحلات على نفس الخط أو إلى عرض رحلة على الممر نفسه.'
                : 'Every card opens directly into find-ride for that corridor, or into route supply for the same lane.'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

import {
  ArrowUpRight,
  CircleDollarSign,
  MoveRight,
  ShieldCheck,
  Timer,
  TrendingUp,
  UsersRound,
} from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router';

interface Route {
  from: string;
  fromAr: string;
  to: string;
  toAr: string;
  price: number;
  currency: string;
  availableRides: number;
  duration: string;
  passengers: number;
  routeNote: string;
  routeNoteAr: string;
  pace: string;
  paceAr: string;
  trending?: boolean;
  discount?: number;
}

const popularRoutes: Route[] = [
  {
    from: 'Amman',
    fromAr: 'عمّان',
    to: 'Zarqa',
    toAr: 'الزرقاء',
    price: 1.5,
    currency: 'JOD',
    availableRides: 289,
    duration: '35m',
    passengers: 5600,
    routeNote: 'Best for daily commuter demand and frequent morning departures.',
    routeNoteAr: 'أفضل ممر للتنقل اليومي مع رحلات صباحية متكررة.',
    pace: 'High-frequency corridor',
    paceAr: 'ممر عالي التردد',
    trending: true,
  },
  {
    from: 'Amman',
    fromAr: 'عمّان',
    to: 'Irbid',
    toAr: 'إربد',
    price: 3,
    currency: 'JOD',
    availableRides: 156,
    duration: '1h 30m',
    passengers: 3200,
    routeNote: 'Strong student and weekend demand with reliable evening returns.',
    routeNoteAr: 'طلب قوي للطلاب وعطلة نهاية الأسبوع مع عودة مسائية مستقرة.',
    pace: 'Dense academic corridor',
    paceAr: 'ممر جامعي كثيف',
    trending: true,
  },
  {
    from: 'Amman',
    fromAr: 'عمّان',
    to: 'Aqaba',
    toAr: 'العقبة',
    price: 12,
    currency: 'JOD',
    availableRides: 76,
    duration: '4h 00m',
    passengers: 1500,
    routeNote: 'Long-distance corridor with shared-seat savings and package demand.',
    routeNoteAr: 'ممر طويل المسافة يوفر في المقاعد المشتركة ويجذب طلب الطرود.',
    pace: 'Long-haul route',
    paceAr: 'ممر بعيد المدى',
    trending: true,
    discount: 20,
  },
  {
    from: 'Amman',
    fromAr: 'عمّان',
    to: 'Jerash',
    toAr: 'جرش',
    price: 2.5,
    currency: 'JOD',
    availableRides: 156,
    duration: '55m',
    passengers: 3200,
    routeNote: 'Popular for short leisure trips with flexible pickup windows.',
    routeNoteAr: 'شائع للرحلات القصيرة مع نوافذ صعود مرنة.',
    pace: 'Weekend favorite',
    paceAr: 'مفضل في عطلة الأسبوع',
  },
  {
    from: 'Amman',
    fromAr: 'عمّان',
    to: 'Madaba',
    toAr: 'مادبا',
    price: 2,
    currency: 'JOD',
    availableRides: 124,
    duration: '40m',
    passengers: 2800,
    routeNote: 'Fast short corridor for regular errands, work, and family visits.',
    routeNoteAr: 'ممر قصير سريع للمهام المتكررة والعمل والزيارات العائلية.',
    pace: 'Fast short route',
    paceAr: 'ممر قصير سريع',
    discount: 10,
  },
  {
    from: 'Amman',
    fromAr: 'عمّان',
    to: 'Karak',
    toAr: 'الكرك',
    price: 5,
    currency: 'JOD',
    availableRides: 203,
    duration: '1h 45m',
    passengers: 4100,
    routeNote: 'A dependable southbound route with strong recurring demand.',
    routeNoteAr: 'ممر جنوبي موثوق بطلب متكرر ومستقر.',
    pace: 'Reliable corridor',
    paceAr: 'ممر موثوق',
  },
  {
    from: 'Irbid',
    fromAr: 'إربد',
    to: 'Jerash',
    toAr: 'جرش',
    price: 2.5,
    currency: 'JOD',
    availableRides: 98,
    duration: '50m',
    passengers: 1900,
    routeNote: 'Useful for campus, service, and family traffic across the north.',
    routeNoteAr: 'مفيد للتنقل الجامعي والخدمي والعائلي في الشمال.',
    pace: 'North connector',
    paceAr: 'ممر ربط شمالي',
  },
  {
    from: 'Zarqa',
    fromAr: 'الزرقاء',
    to: 'Amman',
    toAr: 'عمّان',
    price: 1.5,
    currency: 'JOD',
    availableRides: 112,
    duration: '45m',
    passengers: 2100,
    routeNote: 'Strong return demand into Amman through work and study hours.',
    routeNoteAr: 'طلب عودة قوي إلى عمّان في ساعات العمل والدراسة.',
    pace: 'Inbound peak corridor',
    paceAr: 'ممر ذروة باتجاه العاصمة',
  },
  {
    from: 'Amman',
    fromAr: 'عمّان',
    to: 'Salt',
    toAr: 'السلط',
    price: 2,
    currency: 'JOD',
    availableRides: 145,
    duration: '45m',
    passengers: 2600,
    routeNote: 'A balanced route with steady commuter and family movement.',
    routeNoteAr: 'ممر متوازن بحركة ثابتة للتنقل اليومي والزيارات العائلية.',
    pace: 'Balanced corridor',
    paceAr: 'ممر متوازن',
  },
  {
    from: 'Amman',
    fromAr: 'عمّان',
    to: 'Mafraq',
    toAr: 'المفرق',
    price: 3.5,
    currency: 'JOD',
    availableRides: 54,
    duration: '1h 10m',
    passengers: 980,
    routeNote: 'Emerging route with room for saved alerts and early demand capture.',
    routeNoteAr: 'ممر ناشئ يناسب التنبيهات المبكرة والتقاط الطلب قبل الذروة.',
    pace: 'Emerging route',
    paceAr: 'ممر ناشئ',
  },
];

interface PopularRoutesProps {
  onGetStarted?: () => void;
}

export function PopularRoutes({ onGetStarted }: PopularRoutesProps) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isRTL = language === 'ar';
  const handleGetStarted = onGetStarted ?? (() => navigate('/app/find-ride'));
  const handleOfferRide = () => navigate('/app/offer-ride');
  const handleRouteOpen = (route: Route) => {
    if (onGetStarted) {
      onGetStarted();
      return;
    }

    navigate(
      `/app/find-ride?from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}&search=1`,
    );
  };

  const totalPassengers = popularRoutes.reduce((sum, route) => sum + route.passengers, 0);
  const totalLiveRides = popularRoutes.reduce((sum, route) => sum + route.availableRides, 0);

  return (
    <section
      className="relative overflow-hidden py-24"
      style={{
        background:
          'linear-gradient(180deg, rgba(8,17,34,0.98) 0%, rgba(12,28,52,0.98) 48%, rgba(7,16,31,1) 100%)',
      }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background: [
            'radial-gradient(circle at 12% 18%, rgba(60, 191, 255, 0.22), transparent 26%)',
            'radial-gradient(circle at 84% 16%, rgba(245, 158, 11, 0.16), transparent 22%)',
            'radial-gradient(circle at 64% 82%, rgba(34, 197, 94, 0.14), transparent 20%)',
          ].join(','),
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mx-auto mb-14 max-w-4xl text-center text-white">
          <div className="mb-5 flex items-center justify-center gap-3">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-300/10">
              <TrendingUp className="h-5 w-5 text-cyan-200" />
            </div>
            <Badge className="border-cyan-300/30 bg-cyan-300/10 text-cyan-100">
              {isRTL ? 'الممرات النشطة الآن' : 'Popular right now'}
            </Badge>
          </div>
          <h2 className="mb-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">
            {isRTL ? 'المسارات الأكثر ثقة داخل الأردن' : 'Jordan routes people trust every day'}
          </h2>
          <p className="mx-auto max-w-3xl text-lg leading-8 text-slate-300">
            {isRTL
              ? 'المسارات هنا ليست أسماء فقط. كل بطاقة توضّح سرعة الحركة، السعر المرجعي، والسبب الذي يجعل هذا الممر مناسباً للحجز الآن.'
              : 'These are not just city pairs. Each corridor card shows pace, reference price, and why the route is worth opening now.'}
          </p>
        </div>

        <div className="mb-14 grid gap-5 md:grid-cols-4">
          {[
            {
              label: isRTL ? 'محافظات مغطاة' : 'Governorates covered',
              value: '12',
              detail: isRTL ? 'من عمّان إلى الشمال والجنوب' : 'From Amman into the north and south',
            },
            {
              label: isRTL ? 'رحلات حية' : 'Live rides',
              value: `${totalLiveRides}+`,
              detail: isRTL ? 'معروضة الآن في هذه الممرات' : 'Visible right now on these corridors',
            },
            {
              label: isRTL ? 'مسافرون شهرياً' : 'Monthly travelers',
              value: `${totalPassengers.toLocaleString()}+`,
              detail: isRTL ? 'حركة مشتركة عبر أكثر الممرات نشاطاً' : 'Shared movement across the busiest corridors',
            },
            {
              label: isRTL ? 'الثقة والتحقق' : 'Verified confidence',
              value: 'High',
              detail: isRTL ? 'الالتزام الواضح بالحجز والصعود والتتبع' : 'Clear booking, boarding, and tracking signals',
            },
          ].map((item) => (
            <Card
              key={item.label}
              className="border-white/10 bg-white/6 text-white shadow-[0_18px_40px_rgba(0,0,0,0.24)] backdrop-blur-xl"
            >
              <CardContent className="p-6">
                <div className="mb-2 text-3xl font-semibold text-cyan-100">{item.value}</div>
                <div className="text-sm font-semibold text-white">{item.label}</div>
                <p className="mt-2 text-sm leading-6 text-slate-300">{item.detail}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mb-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {popularRoutes.map((route) => (
            <Card
              key={`${route.from}-${route.to}`}
              className="group overflow-hidden border-white/10 bg-white/6 text-white shadow-[0_18px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-cyan-300/35 hover:bg-white/8"
            >
              <CardContent className="p-6">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="border-cyan-300/30 bg-cyan-300/10 text-cyan-100">
                      {isRTL ? route.paceAr : route.pace}
                    </Badge>
                    {route.trending ? (
                      <Badge className="border-amber-300/30 bg-amber-300/10 text-amber-100">
                        {isRTL ? 'نشط' : 'Trending'}
                      </Badge>
                    ) : null}
                  </div>
                  {route.discount ? (
                    <div className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-100">
                      {route.discount}% {isRTL ? 'خصم' : 'off'}
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => handleRouteOpen(route)}
                  className="w-full text-left"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-lg font-semibold text-white transition-colors group-hover:text-cyan-100">
                        {route.from}
                      </div>
                      <div className="text-sm text-slate-300">{route.fromAr}</div>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/6">
                      <MoveRight className="h-5 w-5 text-cyan-100 transition-transform group-hover:translate-x-1" />
                    </div>
                    <div className="min-w-0 flex-1 text-right">
                      <div className="text-lg font-semibold text-white transition-colors group-hover:text-cyan-100">
                        {route.to}
                      </div>
                      <div className="text-sm text-slate-300">{route.toAr}</div>
                    </div>
                  </div>
                </button>

                <p className="mb-5 text-sm leading-6 text-slate-300">
                  {isRTL ? route.routeNoteAr : route.routeNote}
                </p>

                <div className="mb-5 grid gap-3 rounded-3xl border border-white/10 bg-black/10 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-300">
                      <CircleDollarSign className="h-4 w-4 text-cyan-200" />
                      <span>{isRTL ? 'السعر المرجعي' : 'Reference fare'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white">
                      {route.discount ? (
                        <span className="text-xs text-slate-400 line-through">
                          {Math.round(route.price / (1 - route.discount / 100))}
                        </span>
                      ) : null}
                      <span className="text-lg font-semibold text-cyan-100">
                        {route.price} {route.currency}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Timer className="h-4 w-4 text-cyan-200" />
                      <span>{isRTL ? 'المدة' : 'Typical duration'}</span>
                    </div>
                    <span className="font-medium text-white">{route.duration}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-300">
                      <UsersRound className="h-4 w-4 text-cyan-200" />
                      <span>{isRTL ? 'الرحلات المتاحة' : 'Available rides'}</span>
                    </div>
                    <Badge className="border-cyan-300/30 bg-cyan-300/10 text-cyan-100">
                      {route.availableRides}
                    </Badge>
                  </div>
                </div>

                <div className="mb-5 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
                  <div className="flex items-center gap-2 text-slate-300">
                    <ShieldCheck className="h-4 w-4 text-emerald-200" />
                    <span>{isRTL ? 'إشارة الثقة' : 'Trust signal'}</span>
                  </div>
                  <span className="font-medium text-white">
                    {route.passengers.toLocaleString()}+ {isRTL ? 'مسافر هذا الشهر' : 'travelers this month'}
                  </span>
                </div>

                <Button
                  onClick={() => handleRouteOpen(route)}
                  className="w-full justify-between bg-cyan-300 text-slate-950 hover:bg-cyan-200"
                  size="sm"
                >
                  {isRTL ? 'افتح هذا المسار' : 'Open this corridor'}
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-white/10 bg-white/6 text-white shadow-[0_18px_40px_rgba(0,0,0,0.24)] backdrop-blur-xl">
          <CardContent className="p-8 md:p-10">
            <div className="grid gap-8 md:grid-cols-[1.4fr_0.9fr] md:items-center">
              <div>
                <h3 className="mb-3 text-2xl font-semibold text-white">
                  {isRTL ? 'هل تريد ممر غير موجود هنا؟' : "Need a corridor that is not listed yet?"}
                </h3>
                <p className="max-w-2xl text-base leading-7 text-slate-300">
                  {isRTL
                    ? 'افتح البحث لتلتقط الطلب الحالي، أو اعرض مسارك بنفسك ليبدأ واصل في بناء حركة مشتركة حوله.'
                    : 'Open search to capture today’s demand, or publish your own route so Wasel can start building shared movement around it.'}
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
                <Button
                  onClick={handleGetStarted}
                  className="bg-cyan-300 text-slate-950 hover:bg-cyan-200"
                  size="lg"
                >
                  {isRTL ? 'تصفح كل المسارات' : 'Browse all routes'}
                </Button>
                <Button
                  onClick={handleOfferRide}
                  variant="outline"
                  className="border-white/20 bg-transparent text-white hover:bg-white/8"
                  size="lg"
                >
                  {isRTL ? 'اعرض مسارك' : 'Offer your route'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {[
            {
              title: isRTL ? 'سعر واضح قبل الحجز' : 'Price clarity before booking',
              body: isRTL
                ? 'كل بطاقة تُظهر السعر المرجعي الحالي بدلاً من الاكتفاء باسم الممر.'
                : 'Each card surfaces the current reference fare instead of hiding behind corridor names alone.',
            },
            {
              title: isRTL ? 'إيقاع الحركة ظاهر' : 'Movement pace is visible',
              body: isRTL
                ? 'الصفحة تشرح لماذا هذا الممر مناسب الآن: ذروة، دراسة، عمل، أو عطلة أسبوع.'
                : 'The page explains why a route matters now: peak demand, student traffic, work, or weekend flow.',
            },
            {
              title: isRTL ? 'الثقة جزء من الاكتشاف' : 'Trust is part of discovery',
              body: isRTL
                ? 'إشارات التحقق وعدد المسافرين وتوفر الرحلات تظهر قبل أن يفتح المستخدم صفحة الحجز.'
                : 'Verification, traveler volume, and live ride count all show up before the user opens the booking flow.',
            },
          ].map((item) => (
            <Card
              key={item.title}
              className="border-white/10 bg-white/5 text-white shadow-[0_14px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl"
            >
              <CardContent className="p-6">
                <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10">
                  <ShieldCheck className="h-5 w-5 text-cyan-100" />
                </div>
                <h4 className="mb-2 text-lg font-semibold text-white">{item.title}</h4>
                <p className="text-sm leading-6 text-slate-300">{item.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

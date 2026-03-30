import { MoveRight, TrendingUp, Timer, CircleDollarSign, UsersRound } from 'lucide-react';
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
    trending: true,
    discount: 20,
  },
  {
    from: 'Amman',
    fromAr: 'دبي',
    to: 'Jerash',
    toAr: 'أبوظبي',
    price: 2.5,
    currency: 'JOD',
    availableRides: 156,
    duration: '55m',
    passengers: 3200,
  },
  {
    from: 'Amman',
    fromAr: 'الرياض',
    to: 'Madaba',
    toAr: 'جدة',
    price: 2,
    currency: 'JOD',
    availableRides: 124,
    duration: '40m',
    passengers: 2800,
    discount: 10,
  },
  {
    from: 'Amman',
    fromAr: 'القاهرة',
    to: 'Karak',
    toAr: 'الإسكندرية',
    price: 5,
    currency: 'JOD',
    availableRides: 203,
    duration: '1h 45m',
    passengers: 4100,
  },
  {
    from: 'Irbid',
    fromAr: 'الرياض',
    to: 'Jerash',
    toAr: 'الدمام',
    price: 2.5,
    currency: 'JOD',
    availableRides: 98,
    duration: '50m',
    passengers: 1900,
  },
  {
    from: 'Zarqa',
    fromAr: 'الدوحة',
    to: 'Amman',
    toAr: 'الخور',
    price: 1.5,
    currency: 'JOD',
    availableRides: 112,
    duration: '45m',
    passengers: 2100,
  },
  {
    from: 'Amman',
    fromAr: 'مدينة الكويت',
    to: 'Salt',
    toAr: 'الأحمدي',
    price: 2,
    currency: 'JOD',
    availableRides: 145,
    duration: '45m',
    passengers: 2600,
  },
  {
    from: 'Amman',
    fromAr: 'مسقط',
    to: 'Mafraq',
    toAr: 'صلالة',
    price: 3.5,
    currency: 'JOD',
    availableRides: 54,
    duration: '1h 10m',
    passengers: 980,
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
  
  return (
    <section className="py-20 bg-muted">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <TrendingUp className="w-8 h-8 text-primary" />
            <Badge className="bg-primary/10 text-primary border-primary/20">
              Most Popular
            </Badge>
          </div>
          <h2 className="mb-4">{isRTL ? 'أشهر المسارات عبر الأردن' : "Jordan's Hottest Intercity Routes"}</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {isRTL 
              ? 'أفضل المسارات مبيعاً التي تربط المدن الكبرى. انضم لآلاف المسافرين لتوفير المال وتقليل الانبعاثات الكربونية.'
              : "Top daily corridors linking Amman with Jordan's major cities and destinations. Join the Wasel network for smarter, lower-friction travel across the kingdom."}
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <Card className="border-primary/10">
            <CardContent className="p-6 text-center">
              <div className="text-3xl text-primary mb-2">12</div>
              <p className="text-sm text-muted-foreground">{isRTL ? 'محافظات مغطاة' : 'Governorates Covered'}</p>
              {!isRTL && <p className="text-xs text-muted-foreground/70">محافظات مغطاة</p>}
            </CardContent>
          </Card>
          <Card className="border-primary/10">
            <CardContent className="p-6 text-center">
              <div className="text-3xl text-primary mb-2">150+</div>
              <p className="text-sm text-muted-foreground">{isRTL ? 'مسار نشط يومياً' : 'Active Routes Daily'}</p>
              {!isRTL && <p className="text-xs text-muted-foreground/70">مسار نشط يومياً</p>}
            </CardContent>
          </Card>
          <Card className="bg-white border-primary/10">
            <CardContent className="p-6 text-center">
              <div className="text-3xl text-primary mb-2">50K+</div>
              <p className="text-sm text-muted-foreground">{isRTL ? 'مسافر شهرياً' : 'Monthly Travelers'}</p>
              {!isRTL && <p className="text-xs text-muted-foreground/70">مسافر شهرياً</p>}
            </CardContent>
          </Card>
          <Card className="border-primary/10">
            <CardContent className="p-6 text-center">
              <div className="text-3xl text-primary mb-2">65%</div>
              <p className="text-sm text-muted-foreground">{isRTL ? 'متوسط التوفير' : 'Average Savings'}</p>
              {!isRTL && <p className="text-xs text-muted-foreground/70">متوسط التوفير</p>}
            </CardContent>
          </Card>
        </div>

        {/* Popular Routes Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {popularRoutes.map((route, index) => (
            <Card 
              key={index}
              className="hover:shadow-xl transition-all duration-300 cursor-pointer group border-border hover:border-primary/30 relative overflow-hidden"
            >
              {route.trending && (
                <div className="absolute top-0 right-0 bg-gradient-to-l from-primary to-primary/90 text-primary-foreground px-4 py-1 text-xs flex items-center gap-1 rounded-bl-lg">
                  <TrendingUp className="w-3 h-3" />
                  Trending
                </div>
              )}
              
              {route.discount && (
                <div className="absolute top-0 left-0 bg-gradient-to-r from-accent to-accent/90 text-accent-foreground px-4 py-1 text-xs rounded-br-lg">
                  {route.discount}% OFF
                </div>
              )}

              <CardContent className="p-6">
                {/* Route Header */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-foreground group-hover:text-primary transition-colors">
                        {route.from}
                      </h3>
                      <p className="text-sm text-muted-foreground">{route.fromAr}</p>
                    </div>
                    <MoveRight className="w-6 h-6 text-primary mx-3 group-hover:translate-x-1 transition-transform" />
                    <div className="flex-1 text-right">
                      <h3 className="text-foreground group-hover:text-primary transition-colors">
                        {route.to}
                      </h3>
                      <p className="text-sm text-muted-foreground">{route.toAr}</p>
                    </div>
                  </div>
                </div>

                {/* Route Details */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CircleDollarSign className="w-4 h-4 text-primary" />
                      <span>{isRTL ? 'ابتداءً من' : 'Starting from'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {route.discount && (
                        <span className="text-gray-400 line-through text-xs">
                          {Math.round(route.price / (1 - route.discount / 100))}
                        </span>
                      )}
                      <span className="text-lg text-primary">
                        {route.price} {route.currency}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Timer className="w-4 h-4 text-primary" />
                      <span>{isRTL ? 'المدة' : 'Duration'}</span>
                    </div>
                    <span className="text-foreground">{route.duration}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <UsersRound className="w-4 h-4 text-primary" />
                      <span>{isRTL ? 'الرحلات المتاحة' : 'Available rides'}</span>
                    </div>
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      {route.availableRides}
                    </Badge>
                  </div>
                </div>

                {/* Social Proof */}
                <div className="pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground text-center">
                    {route.passengers.toLocaleString()}+ {isRTL ? 'مسافر هذا الشهر' : 'travelers this month'}
                  </p>
                </div>

                {/* Hover CTA */}
                <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    onClick={handleGetStarted}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    size="sm"
                  >
                    {isRTL ? 'عرض الرحلات المتاحة' : 'View Available Rides'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-8">
              <h3 className="mb-3 text-foreground">{isRTL ? 'لم تجد مسارك؟' : "Can't find your route?"}</h3>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                {isRTL 
                  ? 'نضيف مسارات جديدة كل يوم. انضم إلى واصل وكن أول من يعرف عند توفر مسارك، أو اعرض رحلتك الخاصة!'
                  : "We're adding new routes every day. Join Wasel and be the first to know when your route becomes available, or offer your own ride!"}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  onClick={handleGetStarted}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  size="lg"
                >
                  {isRTL ? 'تصفح جميع المسارات' : 'Browse All Routes'}
                </Button>
                <Button 
                  onClick={handleGetStarted}
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary/5"
                  size="lg"
                >
                  {isRTL ? 'اعرض رحلة' : 'Offer a Ride'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Route Comparison Info */}
        <div className="mt-16 grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CircleDollarSign className="w-8 h-8 text-primary" />
            </div>
            <h4 className="mb-2">{isRTL ? 'أفضل الأسعار مضمونة' : 'Best Prices Guaranteed'}</h4>
            <p className="text-sm text-muted-foreground">
              {isRTL ? 'قارن الأسعار عبر جميع المسارات ووفر حتى 65% مقارنة بالنقل التقليدي' : 'Compare prices across all routes and save up to 65% compared to traditional transport'}
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Timer className="w-8 h-8 text-primary" />
            </div>
            <h4 className="mb-2">{isRTL ? 'التوفر في الوقت الحقيقي' : 'Real-Time Availability'}</h4>
            <p className="text-sm text-muted-foreground">
              {isRTL ? 'تحديثات مباشرة على الرحلات المتاحة مع تأكيد فوري للحجز' : 'Live updates on available rides with instant booking confirmation'}
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <UsersRound className="w-8 h-8 text-primary" />
            </div>
            <h4 className="mb-2">{isRTL ? 'مجتمع موثق' : 'Verified Community'}</h4>
            <p className="text-sm text-muted-foreground">
              {isRTL ? 'سافر بثقة - جميع السائقين والركاب أعضاء موثقون' : 'Travel with confidence - all drivers and passengers are verified members'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

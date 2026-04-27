import { useState } from 'react';
import { Car, MapPin, Package, Search, Shield, Sparkles } from 'lucide-react';
import {
  Button,
  Card,
  Input,
  LayoutContainer,
  SectionWrapper,
  Select,
  Tabs,
  type TabItem,
} from '../../../design-system/components';
import { BrandLockup } from '../../../components/brand';
import { useAuth } from '../../../contexts/AuthContext';
import { useLocalAuth } from '../../../contexts/LocalAuth';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useIframeSafeNavigate } from '../../../hooks/useIframeSafeNavigate';
import { useAuthProviderAvailability } from '../../../hooks/useAuthProviderAvailability';
import { APP_ROUTES } from '../../../router/paths';
import {
  ENTRY_CITY_OPTIONS,
  ENTRY_DEFAULT_AUTH_RETURN_TO,
  ENTRY_DEFAULT_ROUTE_DRAFT,
  buildPackagePrefillPath,
  buildRideSearchPath,
  type EntryRouteDraft,
} from '../../../contracts/entry';
import { buildAuthPagePath } from '../../../utils/authFlow';
import {
  ActionCards,
  BrandPillRow,
  HeroFeatureGrid,
  HeroStats,
  MapHeroPanel,
  SupportActions,
} from './SharedPageComponents';
import type { BrandPillItem, HeroFeatureItem } from './pageTypes';
import { LANDING_RETURN_TO } from './pageTypes';
import '../LandingPage.css';

export function LandingPage() {
  const { signInWithFacebook, signInWithGoogle } = useAuth();
  const { user } = useLocalAuth();
  const authProviders = useAuthProviderAvailability();
  const { language } = useLanguage();
  const navigate = useIframeSafeNavigate();
  const ar = language === 'ar';

  const [mode, setMode] = useState<'ride' | 'package'>('ride');
  const [route, setRoute] = useState<EntryRouteDraft>({ ...ENTRY_DEFAULT_ROUTE_DRAFT });

  const primaryActionPath =
    mode === 'ride' ? buildRideSearchPath(route) : buildPackagePrefillPath(route);
  const emailPath = buildAuthPagePath('signin', LANDING_RETURN_TO);

  const highlights: BrandPillItem[] = [
    { icon: <MapPin size={14} />, label: ar ? 'ممر الأردن المشترك' : 'Shared Jordan corridor' },
    { icon: <Package size={14} />, label: ar ? 'رحلة أو طرد' : 'Ride and package flows' },
    { icon: <Shield size={14} />, label: ar ? 'دعم واضح' : 'Clear support and payment' },
  ];

  const features: HeroFeatureItem[] = [
    {
      icon: <Search size={18} />,
      title: ar ? 'ابدأ بالممر' : 'Start with the corridor',
      detail: ar
        ? 'اختر الممر أولاً ثم افتح الرحلة أو الطرد دون تشتيت.'
        : 'Choose the corridor first, then open the ride or package flow.',
    },
    {
      icon: <Package size={18} />,
      title: ar ? 'خدمتان واضحتان' : 'Two clear customer flows',
      detail: ar
        ? 'الرحلات والطرود فقط. لا توجد أسطح إضافية تربك المستخدم.'
        : 'Rides and packages stay visible from entry to checkout, without extra product layers.',
    },
    {
      icon: <Shield size={18} />,
      title: ar ? 'لا نجاح دون تأكيد' : 'No success without confirmation',
      detail: ar
        ? 'لا يظهر الاكتمال إلا بعد تأكيد الخلفية.'
        : 'Nothing looks complete until the backend confirms it.',
    },
  ];

  const stats = [
    {
      label: ar ? 'الأفعال الأساسية' : 'Core actions',
      value: '3',
      detail: ar ? 'احجز، اعرض، أرسل.' : 'Book, offer, and send.',
    },
    {
      label: ar ? 'المدن المرسومة' : 'Mapped cities',
      value: '12',
      detail: ar
        ? 'سياق الممر من الشمال إلى الجنوب.'
        : 'North-to-south corridor context stays visible.',
    },
    {
      label: ar ? 'الدعم المباشر' : 'Live support',
      value: '24/7',
      detail: ar
        ? 'المساعدة والدفع قريبان من المسار.'
        : 'Support and payment guidance stay close to the route.',
    },
  ];

  const plannerSteps = [
    {
      label: ar ? 'اختر المسار' : 'Choose corridor',
      detail: ar ? 'حدد الممر أولاً.' : 'Pick the corridor first.',
    },
    {
      label: ar ? 'حدد التوقيت' : 'Set timing',
      detail:
        mode === 'ride'
          ? ar
            ? 'قارن الوقت والمقعد.'
            : 'Compare timing and seat.'
          : ar
            ? 'حدد وقت الالتقاط والتسليم.'
            : 'Set pickup and drop-off timing.',
    },
    {
      label: ar ? 'أكمل الطلب' : 'Finish the action',
      detail:
        mode === 'ride'
          ? ar
            ? 'أكمل حجز الرحلة.'
            : 'Complete the ride booking.'
          : ar
            ? 'أكمل إرسال الطرد.'
            : 'Complete the package request.',
    },
  ];

  const signals =
    mode === 'ride'
      ? [
          ar ? 'الرحلات مرئية' : 'Ride routes visible',
          ar ? 'المقعد والوقت واضحان' : 'Seat and timing visible',
          ar ? 'الدعم قريب' : 'Support close by',
        ]
      : [
          ar ? 'الطرد على نفس الممر' : 'Package on the same corridor',
          ar ? 'الاستلام والتسليم واضحان' : 'Pickup and drop-off clear',
          ar ? 'الدعم قريب' : 'Support close by',
        ];

  return (
    <LayoutContainer width="wide">
      <main className="ds-page landing-page" role="main">
        <header className="ds-shell-header__inner landing-page__topbar">
          <div className="landing-page__brand-block">
            <button
              className="ds-shell-header__brand landing-page__brand"
              onClick={() => navigate('/')}
              type="button"
            >
              <BrandLockup
                showTagline
                size="lg"
                surface="light"
                tagline="RIDE AND PACKAGE MARKETPLACE"
              />
            </button>
            <div className="landing-page__status-pill">
              <span aria-hidden="true" className="landing-page__status-dot" />
              {ar ? 'احجز رحلة أو أرسل طرداً' : 'Book a ride or send a package'}
            </div>
          </div>

          <div className="ds-shell-header__actions landing-page__topbar-actions">
            <div className="landing-page__status-copy">
              {ar
                ? 'احجز رحلة أو اعرض رحلة أو أرسل طرداً.'
                : 'Book a ride, offer a ride, or send a package.'}
            </div>
            {!user ? (
              <>
                <Button onClick={() => navigate(buildAuthPagePath('signin', ENTRY_DEFAULT_AUTH_RETURN_TO))}>
                  {ar ? 'تسجيل الدخول' : 'Sign in'}
                </Button>
                <Button
                  onClick={() => navigate(buildAuthPagePath('signup', ENTRY_DEFAULT_AUTH_RETURN_TO))}
                  variant="secondary"
                >
                  {ar ? 'إنشاء حساب' : 'Create account'}
                </Button>
              </>
            ) : null}
            <SupportActions />
          </div>
        </header>

        <section className="ds-landing-grid landing-page__hero">
          <Card className="landing-page__hero-copy-card">
            <div className="landing-page__hero-intro">
              <div className="ds-eyebrow landing-page__hero-eyebrow">
                <Sparkles size={14} />
                {ar ? 'سوق الرحلات والطرود' : 'Ride and package marketplace'}
              </div>
              <h1 className="ds-title ds-title--landing landing-page__title">
                {ar
                  ? 'احجز رحلة أو اعرض رحلة أو أرسل طرداً.'
                  : 'Book a ride, offer a ride, or send a package.'}
              </h1>
              <p className="ds-copy landing-page__hero-copy">
                {ar
                  ? 'اختر الممر أولاً ثم أكمل طلباً حقيقياً فقط.'
                  : 'Choose the corridor first, then complete one real action only.'}
              </p>
            </div>

            <div className="landing-page__hero-actions">
              <Button onClick={() => navigate(primaryActionPath)}>
                {mode === 'ride'
                  ? ar
                    ? 'احجز رحلة'
                    : 'Book a ride'
                  : ar
                    ? 'أرسل طرداً'
                    : 'Send a package'}
              </Button>
              <Button onClick={() => navigate(APP_ROUTES.offerRide.full)} variant="secondary">
                {ar ? 'اعرض رحلة' : 'Offer a ride'}
              </Button>
            </div>

            <BrandPillRow items={highlights} />

            <div className="landing-page__summary-grid">
              {[
                {
                  title: ar ? 'اختر الممر أولاً' : 'Choose the corridor first',
                  detail: ar
                    ? 'حدد المسار مرة واحدة ثم افتح الرحلة أو الطرد.'
                    : 'Pick the corridor once, then move directly into the ride or package flow.',
                },
                {
                  title: ar ? 'تأكيد من الخلفية' : 'Backend-confirmed only',
                  detail: ar
                    ? 'لا يكتمل أي طلب قبل تأكيد الخلفية.'
                    : 'Nothing looks complete until the backend confirms the action.',
                },
              ].map(item => (
                <div className="landing-page__summary-card" key={item.title}>
                  <div className="landing-page__summary-label">{item.title}</div>
                  <p className="landing-page__summary-detail">{item.detail}</p>
                </div>
              ))}
            </div>
          </Card>

          <MapHeroPanel
            className="landing-page__planner-shell"
            mapVariant="ambient"
            signals={signals}
          >
            <div className="ds-hero-panel__intro landing-page__planner-head">
              <div className="ds-panel-kicker">
                {ar ? 'مخطط الممر' : 'Corridor planner'}
              </div>
              <h2 className="ds-section-title landing-page__planner-title">
                {ar ? 'اختر ممراً ثم افتح الرحلة أو الطرد.' : 'Choose a corridor, then book a ride or send a package.'}
              </h2>
            </div>

            <div className="landing-page__planner-surface">
              <Tabs
                items={
                  [
                    {
                      content: (
                        <p className="landing-page__tab-copy">
                          {ar
                            ? 'قارن المسار والوقت والمقعد قبل الحجز.'
                            : 'Compare the route, timing, and seat before you book.'}
                        </p>
                      ),
                      label: ar ? 'رحلات' : 'Rides',
                      value: 'ride',
                    },
                    {
                      content: (
                        <p className="landing-page__tab-copy">
                          {ar
                            ? 'استخدم نفس الممر لإرسال طرد.'
                            : 'Use the same corridor to send a package.'}
                        </p>
                      ),
                      label: ar ? 'طرود' : 'Packages',
                      value: 'package',
                    },
                  ] satisfies TabItem<'ride' | 'package'>[]
                }
                label={ar ? 'الخدمات' : 'Services'}
                onChange={setMode}
                value={mode}
              />

              <div className="ds-step-rail landing-page__step-rail">
                {plannerSteps.map((step, i) => (
                  <div className="ds-step-rail__item" data-active={i === 0} key={step.label}>
                    <span className="ds-step-rail__index">{i + 1}</span>
                    <div>
                      <strong>{step.label}</strong>
                      <div className="ds-caption">{step.detail}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="ds-form-grid landing-page__planner-form">
                <Select
                  label={ar ? 'المغادرة من' : 'Leaving from'}
                  onChange={e => setRoute(r => ({ ...r, from: e.target.value }))}
                  options={ENTRY_CITY_OPTIONS.map(c => ({
                    label: ar ? c.ar : c.en,
                    value: c.value,
                  }))}
                  value={route.from}
                />
                <Select
                  label={ar ? 'الوصول إلى' : 'Going to'}
                  onChange={e => setRoute(r => ({ ...r, to: e.target.value }))}
                  options={ENTRY_CITY_OPTIONS.map(c => ({
                    label: ar ? c.ar : c.en,
                    value: c.value,
                  }))}
                  value={route.to}
                />
                <Input
                  label={ar ? 'متى' : 'When'}
                  onChange={e => setRoute(r => ({ ...r, date: e.target.value }))}
                  type="date"
                  value={route.date}
                />
              </div>

              <div className="landing-page__planner-actions">
                <Button fullWidth onClick={() => navigate(primaryActionPath)}>
                  {mode === 'ride'
                    ? ar
                      ? 'احجز رحلة'
                      : 'Book a ride'
                    : ar
                      ? 'أرسل طرداً'
                      : 'Send a package'}
                </Button>
                <Button fullWidth onClick={() => navigate(APP_ROUTES.offerRide.full)} variant="secondary">
                  {ar ? 'اعرض رحلة' : 'Offer a ride'}
                </Button>
              </div>

              {!user ? (
                <div className="landing-page__planner-auth">
                  <div className="landing-page__planner-auth-copy">
                    {ar
                      ? 'استمر بحسابك لحفظ الحجوزات والدفع في مكان واحد.'
                      : 'Continue with your account to keep bookings and payments in one place.'}
                  </div>
                  <div className="ds-social-grid landing-page__social-grid">
                    {authProviders.google.enabled ? (
                      <Button fullWidth onClick={() => void signInWithGoogle(LANDING_RETURN_TO)} variant="secondary">
                        {ar ? 'المتابعة مع Google' : 'Continue with Google'}
                      </Button>
                    ) : null}
                    {authProviders.facebook.enabled ? (
                      <Button fullWidth onClick={() => void signInWithFacebook(LANDING_RETURN_TO)} variant="secondary">
                        {ar ? 'المتابعة مع Facebook' : 'Continue with Facebook'}
                      </Button>
                    ) : null}
                    <Button fullWidth onClick={() => navigate(emailPath)} variant="ghost">
                      {ar ? 'المتابعة بالبريد الإلكتروني' : 'Continue with email'}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </MapHeroPanel>
        </section>

        <section aria-label="Landing page proof points" className="landing-page__proof">
          <HeroFeatureGrid items={features} />
          <HeroStats items={stats} />
        </section>

        <SectionWrapper
          className="landing-page__section"
          description={ar ? 'ثلاثة أفعال مباشرة فقط.' : 'Three direct customer actions only.'}
          eyebrow={<><Sparkles size={14} />{ar ? 'اختر ما تريد' : 'Choose what to do'}</>}
          title={ar ? 'اختر ما تريد' : 'Choose what to do'}
        >
          <ActionCards
            items={[
              {
                detail: ar ? 'قارن الممر والتوقيت والمقعد.' : 'Compare the corridor, timing, and seat.',
                icon: <Search size={18} />,
                path: buildRideSearchPath(route),
                title: ar ? 'احجز رحلة' : 'Book a ride',
              },
              {
                detail: ar ? 'أرسل طرداً عبر نفس الممر.' : 'Send a package through the same corridor.',
                icon: <Package size={18} />,
                path: buildPackagePrefillPath(route),
                title: ar ? 'أرسل طرداً' : 'Send a package',
              },
              {
                detail: ar ? 'انشر رحلتك وافتح المقاعد.' : 'Post your route and open seats.',
                icon: <Car size={18} />,
                path: APP_ROUTES.offerRide.full,
                title: ar ? 'اعرض رحلة' : 'Offer a ride',
              },
            ]}
            onNavigate={navigate}
          />
        </SectionWrapper>
      </main>
    </LayoutContainer>
  );
}

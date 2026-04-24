/**
 * LandingPageSurface
 *
 * The public entry point for Wasel. Route: `/`
 *
 * Responsibilities:
 *  - Hero section with route planner and map panel
 *  - Social auth shortcuts (Google / Facebook / email)
 *  - Feature proof section and stats
 *  - Navigation into core flows (Find Ride, Packages, Create Ride, Bus, Mobility OS)
 *
 * NOT responsible for:
 *  - Route matching or auth redirects (handled by WaselRoot / waselRouter)
 *  - Data fetching (all ride/package data is in feature modules)
 */
import { useState } from 'react';
import { Bus, Car, MapPin, Package, Search, Shield, Sparkles } from 'lucide-react';
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
    { icon: <MapPin size={14} />, label: ar ? 'خريطة الأردن' : 'Jordan corridor view' },
    { icon: <Package size={14} />, label: ar ? 'رحلات وطرود' : 'Rides and packages together' },
    { icon: <Shield size={14} />, label: ar ? 'الثقة قريبة' : 'Trust stays nearby' },
  ];

  const features: HeroFeatureItem[] = [
    {
      icon: <Search size={18} />,
      title: ar ? 'ابدأ بالمسار' : 'Start with the route',
      detail: ar
        ? 'قدّم الممر أولاً حتى يفهم المسافر الرحلة قبل ظهور خيارات المنتج.'
        : 'Lead with the corridor first so riders understand the trip before product choices appear.',
    },
    {
      icon: <Package size={18} />,
      title: ar ? 'لغة خدمة موحّدة' : 'One shared service language',
      detail: ar
        ? 'الرحلات والطرود والحافلات تبقى داخل نفس التسلسل الهرمي والمسافات وصدفة الحساب.'
        : 'Rides, packages, and bus all stay inside the same hierarchy, spacing, and account shell.',
    },
    {
      icon: <Shield size={18} />,
      title: ar ? 'الثقة في نفس الصدفة' : 'Trust in the same shell',
      detail: ar
        ? 'الدعم وتسجيل الدخول والاسترداد تبقى قريبة من المسار بدلاً من أن تصبح منتجات منفصلة.'
        : 'Support, sign-in, and recovery stay close to the route instead of becoming separate products.',
    },
  ];

  const stats = [
    { label: ar ? 'الخدمات الأساسية' : 'Core services', value: '4', detail: ar ? 'رحلات وحافلة وطرود ومحفظة.' : 'Rides, bus, packages, and wallet.' },
    { label: ar ? 'المدن المرسومة' : 'Mapped cities', value: '12', detail: ar ? 'سياق الممر من الشمال إلى الجنوب.' : 'North-to-south corridor context stays visible.' },
    { label: ar ? 'الدعم المباشر' : 'Live support', value: '24/7', detail: ar ? 'الاسترداد والمساعدة قريبان من المسار.' : 'Recovery and help stay close to the route.' },
  ];

  const plannerSteps = [
    { label: ar ? 'اختر المسار' : 'Select route', detail: ar ? 'اختر الممر الذي تريد المرور عبره.' : 'Pick the corridor you want to move through.' },
    {
      label: ar ? 'حدد التوقيت' : 'Set timing',
      detail: mode === 'ride'
        ? (ar ? 'اختر التوقيت وقارن المقاعد.' : 'Choose timing and compare seats.')
        : (ar ? 'اختر التوقيت والتسليم.' : 'Choose timing and handoff.'),
    },
    { label: ar ? 'افتح التدفق' : 'Open flow', detail: ar ? 'استمر في التدفق الرئيسي بنفس التخطيط.' : 'Continue into the main flow with the same layout.' },
  ];

  const signals = mode === 'ride'
    ? [ar ? 'مسارات الرحلات مباشرة' : 'Ride routes live', ar ? 'المقاعد والتوقيت مرئية' : 'Seats and timings visible', ar ? 'الدعم بنقرة واحدة' : 'Support one tap away']
    : [ar ? 'ممرات الطرود مباشرة' : 'Package lanes live', ar ? 'تسليم الممر المشترك' : 'Shared corridor handoff', ar ? 'الدعم بنقرة واحدة' : 'Support one tap away'];

  return (
    <LayoutContainer width="wide">
      <main className="ds-page landing-page" role="main">
        {/* ─── Top bar ─────────────────────────────────────────────── */}
        <header className="ds-shell-header__inner landing-page__topbar">
          <div className="landing-page__brand-block">
            <button
              className="ds-shell-header__brand landing-page__brand"
              onClick={() => navigate('/')}
              type="button"
            >
              <BrandLockup showTagline size="lg" surface="light" tagline="LIVE MOBILITY NETWORK" />
            </button>
            <div className="landing-page__status-pill">
              <span aria-hidden="true" className="landing-page__status-dot" />
              {ar ? 'ممر الأردن مباشر' : 'Jordan corridor live'}
            </div>
          </div>

          <div className="ds-shell-header__actions landing-page__topbar-actions">
            <div className="landing-page__status-copy">
              {ar
                ? 'نظام مسار واحد للرحلات والطرود والدعم.'
                : 'One route system for rides, packages, and support.'}
            </div>
            {!user && (
              <>
                <Button
                  onClick={() =>
                    navigate(buildAuthPagePath('signin', ENTRY_DEFAULT_AUTH_RETURN_TO))
                  }
                >
                  {ar ? 'تسجيل الدخول' : 'Sign in'}
                </Button>
                <Button
                  onClick={() =>
                    navigate(buildAuthPagePath('signup', ENTRY_DEFAULT_AUTH_RETURN_TO))
                  }
                  variant="secondary"
                >
                  {ar ? 'إنشاء حساب' : 'Create account'}
                </Button>
              </>
            )}
            <SupportActions />
          </div>
        </header>

        {/* ─── Hero ─────────────────────────────────────────────────── */}
        <section className="ds-landing-grid landing-page__hero">
          <Card className="landing-page__hero-copy-card">
            <div className="landing-page__hero-intro">
              <div className="ds-eyebrow landing-page__hero-eyebrow">
                <Sparkles size={14} />
                {ar ? 'شبكة التنقل في الأردن' : 'Jordan mobility network'}
              </div>
              <h1 className="ds-title ds-title--landing landing-page__title">
                {ar
                  ? 'ابدأ بممر واضح لكل تحرك في واصل.'
                  : 'Start with one clear corridor for every Wasel move.'}
              </h1>
              <p className="ds-copy landing-page__hero-copy">
                {ar
                  ? 'ابدأ من طبقة المسار المباشر، ثم انتقل إلى الرحلات أو الطرود أو الحافلات دون تغيير لغة الصفحة.'
                  : 'Start from the live route layer, then move into rides, packages, or buses without changing the page language.'}
              </p>
            </div>

            <div className="landing-page__hero-actions">
              <Button onClick={() => navigate(primaryActionPath)}>
                {ar ? 'خطط هذا الممر' : 'Plan this corridor'}
              </Button>
              <Button onClick={() => navigate(APP_ROUTES.mobilityOs.full)} variant="secondary">
                {ar ? 'افتح نظام التنقل' : 'Open Mobility OS'}
              </Button>
            </div>

            <BrandPillRow items={highlights} />

            <div className="landing-page__summary-grid">
              {[
                {
                  title: ar ? 'الدخول أولاً بالمسار' : 'Route-first entry',
                  detail: ar
                    ? 'خطط الممر مرة واحدة، ثم انتقل من الاكتشاف إلى الإجراء دون فقدان السياق المرئي.'
                    : 'Plan the corridor once, then move from discovery to action without losing visual context.',
                },
                {
                  title: ar ? 'سمة تشغيل واحدة' : 'One operating theme',
                  detail: ar
                    ? 'استخدم نفس اللوحة وعمق السطح وأسلوب التحكم عبر الرحلات والطرود والدعم.'
                    : 'Use the same palette, surface depth, and control style across rides, packages, and support.',
                },
              ].map(item => (
                <div className="landing-page__summary-card" key={item.title}>
                  <div className="landing-page__summary-label">{item.title}</div>
                  <p className="landing-page__summary-detail">{item.detail}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* ─── Map planner panel ─────────────────────────────────── */}
          <MapHeroPanel
            className="landing-page__planner-shell"
            mapVariant="ambient"
            signals={signals}
          >
            <div className="ds-hero-panel__intro landing-page__planner-head">
              <div className="ds-panel-kicker">
                {ar ? 'مخطط المسار المباشر' : 'Live route planner'}
              </div>
              <h2 className="ds-section-title landing-page__planner-title">
                {ar
                  ? 'اختر ممراً واحداً واجعل كل خطوة تالية مألوفة.'
                  : 'Choose one corridor and keep every next step familiar.'}
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
                            ? 'قارن المسار والتوقيت وتوفر المقاعد من مخطط واصل المتسق.'
                            : 'Compare route, timing, and seat availability from one consistent Wasel planner.'}
                        </p>
                      ),
                      label: ar ? 'رحلات' : 'Rides',
                      value: 'ride',
                    },
                    {
                      content: (
                        <p className="landing-page__tab-copy">
                          {ar
                            ? 'ابدأ من نفس الممر واستمر في تدفق تسليم طرود أخف.'
                            : 'Start from the same corridor and continue into a lighter package handoff flow.'}
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
                  {mode === 'ride' ? (ar ? 'ابحث عن رحلة' : 'Find a ride') : (ar ? 'افتح الطرود' : 'Open packages')}
                </Button>
                <Button
                  fullWidth
                  onClick={() => navigate(APP_ROUTES.offerRide.full)}
                  variant="secondary"
                >
                  {ar ? 'إنشاء رحلة' : 'Create ride'}
                </Button>
              </div>

              {!user && (
                <div className="landing-page__planner-auth">
                  <div className="landing-page__planner-auth-copy">
                    {ar
                      ? 'استمر بحسابك للاحتفاظ بالدعم وتاريخ المسار وسياق الدفع في مكان واحد.'
                      : 'Continue with your account to keep support, route history, and payment context in one place.'}
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
              )}
            </div>
          </MapHeroPanel>
        </section>

        {/* ─── Proof section ────────────────────────────────────────── */}
        <section aria-label="Landing page proof points" className="landing-page__proof">
          <HeroFeatureGrid items={features} />
          <HeroStats items={stats} />
        </section>

        {/* ─── Choose your flow ─────────────────────────────────────── */}
        <SectionWrapper
          className="landing-page__section"
          description={ar
            ? 'ثلاث نقاط دخول مباشرة تعيد استخدام نفس لغة الممر والإجراء.'
            : 'Three direct entry points that reuse the same corridor and action language.'}
          eyebrow={<><Sparkles size={14} />{ar ? 'اختر تدفقك' : 'Choose your flow'}</>}
          title={ar ? 'اختر تدفقك' : 'Choose your flow'}
        >
          <ActionCards
            items={[
              { detail: ar ? 'قارن الممر والتوقيت والمقعد.' : 'Compare the corridor, timing, and seat.', icon: <Search size={18} />, path: primaryActionPath, title: ar ? 'ابحث عن رحلة' : 'Find a ride' },
              { detail: ar ? 'أرفق الطرد بنفس الشبكة.' : 'Attach the parcel to the same network.', icon: <Package size={18} />, path: '/app/packages', title: ar ? 'أرسل طرداً' : 'Send a package' },
              { detail: ar ? 'حوّل مغادرة فارغة إلى قيمة أكبر.' : 'Turn an empty departure into more value.', icon: <Car size={18} />, path: '/app/create-ride', title: ar ? 'إنشاء رحلة' : 'Create ride' },
            ]}
            onNavigate={navigate}
          />
        </SectionWrapper>

        {/* ─── Network tools ────────────────────────────────────────── */}
        <SectionWrapper
          className="landing-page__section"
          description={ar
            ? 'خدمات الحافلات ونظام التنقل تبقى مرئية كأسطح واصل من الدرجة الأولى.'
            : 'Bus services and Mobility OS stay visible as first-class Wasel surfaces.'}
          eyebrow={<><Sparkles size={14} />{ar ? 'أدوات الشبكة' : 'Network tools'}</>}
          title={ar ? 'أدوات الحافلة والممر' : 'Bus and corridor tools'}
        >
          <ActionCards
            items={[
              { detail: ar ? 'احجز مسارات ممر الأردن الرسمية من سطح مباشر.' : 'Book official Jordan corridor routes from one direct surface.', icon: <Bus size={18} />, path: '/app/bus', title: ar ? 'واصل باص' : 'Wasel Bus' },
              { detail: ar ? 'افتح خريطة الممر وقم بتبديل التدفقات دون فقدان السياق.' : 'Open the corridor map and switch flows without losing context.', icon: <MapPin size={18} />, path: '/app/mobility-os', title: ar ? 'نظام التنقل' : 'Mobility OS' },
            ]}
            onNavigate={navigate}
          />
        </SectionWrapper>
      </main>
    </LayoutContainer>
  );
}

import { ArrowRight, Lock, Sparkles } from 'lucide-react';
import { useLocation } from 'react-router';
import { useLanguage } from '../../contexts/LanguageContext';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { C, F, R, SH, SPACE, TYPE } from '../../utils/wasel-ds';
import { Button } from '../ui/button';

type PreviewConfig = {
  accent: string;
  eyebrow: string;
  title: string;
  description: string;
  highlights: string[];
  secondaryTarget: string;
  secondaryLabel: string;
};

function matches(pathname: string, candidates: string[]) {
  return candidates.some(
    candidate => pathname === candidate || pathname.startsWith(`${candidate}/`),
  );
}

function resolvePreviewConfig(pathname: string, ar: boolean): PreviewConfig {
  if (matches(pathname, ['/app/find-ride'])) {
    return {
      accent: C.cyan,
      eyebrow: ar ? 'معاينة المسارات' : 'Route Preview',
      title: ar ? 'سجل الدخول لمقارنة الرحلات الحية' : 'Sign in to compare live rides',
      description: ar
        ? 'افتح هذا المسار لرؤية توفر المقاعد، إشارات الطلب، ونقاط الالتقاط قبل الحجز.'
        : 'Open this corridor to see live seat supply, demand signals, and pickup clarity before you book.',
      highlights: ar
        ? ['مقارنة السعر والوقت والثقة', 'تذكيرات للممرات المتكررة', 'خيارات بديلة عند ضعف العرض']
        : [
            'Compare price, timing, and trust',
            'Save recurring corridor reminders',
            'See fallback options when supply is thin',
          ],
      secondaryTarget: '/app',
      secondaryLabel: ar ? 'العودة للرئيسية' : 'Back to home',
    };
  }

  if (matches(pathname, ['/app/offer-ride', '/app/driver'])) {
    return {
      accent: C.gold,
      eyebrow: ar ? 'سطح السائق' : 'Driver Surface',
      title: ar ? 'سجل الدخول لفتح عرض الرحلات' : 'Sign in to open route supply',
      description: ar
        ? 'أنشئ رحلة، راجع الجاهزية، وافتح المقاعد والطرود من سطح واحد.'
        : 'Post a route, review readiness, and manage seats and parcels from one supply surface.',
      highlights: ar
        ? ['خطة سعر وربح للمسار', 'طلبات مباشرة من الركاب', 'بوابات ثقة قبل النشر']
        : [
            'Route pricing and earnings plan',
            'Incoming rider requests',
            'Trust gates before going live',
          ],
      secondaryTarget: '/app/trust',
      secondaryLabel: ar ? 'استكشف الثقة' : 'Explore trust',
    };
  }

  if (matches(pathname, ['/app/my-trips', '/app/live-trip'])) {
    return {
      accent: C.green,
      eyebrow: ar ? 'حالة الرحلات' : 'Trip Status',
      title: ar ? 'سجل الدخول لعرض رحلاتك الحية' : 'Sign in to view your live trips',
      description: ar
        ? 'تابع التذاكر، الحالة، الدعم، وتتبع الرحلة في مكان واحد واضح.'
        : 'Keep tickets, status, support, and live trip tracking in one clear place.',
      highlights: ar
        ? ['الرحلات النشطة أولًا', 'حالة الدفع والدعم في سجل واحد', 'تتبع حي أثناء الحركة']
        : [
            'Active trips and exceptions first',
            'Payment and support state in one ledger',
            'Live tracking during movement',
          ],
      secondaryTarget: '/app',
      secondaryLabel: ar ? 'العودة للرئيسية' : 'Back to home',
    };
  }

  if (matches(pathname, ['/app/bus'])) {
    return {
      accent: C.green,
      eyebrow: ar ? 'الممرات الثابتة' : 'Fixed Corridors',
      title: ar ? 'سجل الدخول لفتح حجوزات الباص' : 'Sign in to view bus bookings',
      description: ar
        ? 'شاهد المغادرات الرسمية، حالة التوفر، وخيارات النسخ الاحتياطية قبل الحجز.'
        : 'See official departures, seat status, and fallback options before you book.',
      highlights: ar
        ? [
            'جداول رسمية ومصادر مباشرة',
            'مقارنة المشغلين والمغادرات',
            'خيار بديل عند عدم ملاءمة المشاركة',
          ]
        : [
            'Official schedules and verified sources',
            'Compare operators and departures',
            'Fallback when shared rides are not the right fit',
          ],
      secondaryTarget: '/app/routes',
      secondaryLabel: ar ? 'استكشف المسارات' : 'Explore routes',
    };
  }

  if (matches(pathname, ['/app/packages', '/app/raje3'])) {
    return {
      accent: C.gold,
      eyebrow: ar ? 'شبكة الطرود' : 'Goods Network',
      title: ar ? 'سجل الدخول لإرسال أو تتبع الطرود' : 'Sign in to send or track parcels',
      description: ar
        ? 'وصّل الطرود على نفس شبكة الرحلات، أو افتح تدفق الإرجاع الذكي من نفس المسار.'
        : 'Move parcels on the same route network, or open the smart returns flow from the same corridor system.',
      highlights: ar
        ? [
            'إرسال وتتبع وإرجاع من سطح واحد',
            'مطابقة فورية مع الرحلات المناسبة',
            'أكواد تسليم ودعم مرتبط بالطلب',
          ]
        : [
            'Send, track, and return in one place',
            'Match parcels to live connected rides',
            'Handoff proof and support on the same request',
          ],
      secondaryTarget: '/app/routes',
      secondaryLabel: ar ? 'استكشف المسارات' : 'Explore routes',
    };
  }

  if (matches(pathname, ['/app/wallet', '/app/plus'])) {
    return {
      accent: C.cyan,
      eyebrow: ar ? 'المحفظة والمزايا' : 'Wallet and Benefits',
      title: ar ? 'سجل الدخول لفتح محفظة واصل' : 'Sign in to open Wasel Wallet',
      description: ar
        ? 'اعرض الرصيد، التحويلات، المكافآت، والاشتراكات من سطح مالي واحد.'
        : 'See balance, transfers, rewards, and subscriptions from one financial surface.',
      highlights: ar
        ? ['شحن وسحب وتحويلات', 'مكافآت وWasel Plus', 'تحليلات وإنفاق واضح']
        : [
            'Top-up, withdraw, and send money',
            'Rewards and Wasel Plus access',
            'Clear spending and insight views',
          ],
      secondaryTarget: '/app',
      secondaryLabel: ar ? 'العودة للرئيسية' : 'Back to home',
    };
  }

  if (matches(pathname, ['/app/profile', '/app/settings'])) {
    return {
      accent: C.cyan,
      eyebrow: ar ? 'الهوية والإعدادات' : 'Identity and Settings',
      title: ar ? 'سجل الدخول لإدارة حسابك' : 'Sign in to manage your account',
      description: ar
        ? 'حدّث الهوية، التفضيلات، الأمان، وقنوات الدعم من مكان واحد.'
        : 'Update identity, preferences, security, and support channels from one account surface.',
      highlights: ar
        ? ['بيانات الهوية والثقة', 'الأمان وكلمات المرور و2FA', 'اللغة والإشعارات والخصوصية']
        : [
            'Identity and trust details',
            'Passwords, security, and 2FA',
            'Language, notifications, and privacy controls',
          ],
      secondaryTarget: '/app',
      secondaryLabel: ar ? 'العودة للرئيسية' : 'Back to home',
    };
  }

  if (matches(pathname, ['/app/notifications'])) {
    return {
      accent: C.cyan,
      eyebrow: ar ? 'مركز الإشعارات' : 'Notification Center',
      title: ar ? 'سجل الدخول لمتابعة التحديثات المهمة' : 'Sign in to follow important updates',
      description: ar
        ? 'رتّب إشعارات الرحلات والمحفظة والثقة والدعم من نفس الصندوق.'
        : 'Triage rides, wallet, trust, and support updates from one feed.',
      highlights: ar
        ? ['تصفية حسب النوع والأولوية', 'فتح الإجراء مباشرة من الإشعار', 'أرشفة دون فقدان السياق']
        : [
            'Filter by type and urgency',
            'Open the next action directly',
            'Archive without losing context',
          ],
      secondaryTarget: '/app',
      secondaryLabel: ar ? 'العودة للرئيسية' : 'Back to home',
    };
  }

  if (matches(pathname, ['/app/trust', '/app/safety'])) {
    return {
      accent: C.green,
      eyebrow: ar ? 'الثقة والسلامة' : 'Trust and Safety',
      title: ar ? 'سجل الدخول لإكمال الثقة والحماية' : 'Sign in to complete trust and safety',
      description: ar
        ? 'تحقّق من الهوية، فعّل الهاتف والبريد، وافتح الخدمات الحساسة عبر حساب موثوق.'
        : 'Verify identity, confirm contact channels, and unlock sensitive flows with a trusted account.',
      highlights: ar
        ? ['خطوات ثقة واضحة', 'جاهزية السائق والمحفظة', 'سجل حماية ودعم أثناء الحركة']
        : [
            'Clear staged trust workflow',
            'Driver and wallet readiness gates',
            'Protection and support during movement',
          ],
      secondaryTarget: '/app',
      secondaryLabel: ar ? 'العودة للرئيسية' : 'Back to home',
    };
  }

  return {
    accent: C.cyan,
    eyebrow: ar ? 'معاينة مسجلة الخروج' : 'Signed-out Preview',
    title: ar ? 'سجل الدخول لفتح هذه التجربة' : 'Sign in to open this experience',
    description: ar
      ? 'نُبقي هذه المعاينة واضحة حتى تعرف ما الذي سيفتحه حساب واصل الموثق بعد تسجيل الدخول.'
      : 'This preview stays visible so you can see what a trusted Wasel account unlocks after sign-in.',
    highlights: ar
      ? [
          'رحلات وطرود ومحفظة في شبكة واحدة',
          'تفضيلات وحماية مرتبطة بالحساب',
          'الخطوة التالية واضحة من أول شاشة',
        ]
      : [
          'Rides, parcels, and wallet on one network',
          'Preferences and protection tied to your account',
          'A clear next step from the first screen',
        ],
    secondaryTarget: '/app',
    secondaryLabel: ar ? 'العودة للرئيسية' : 'Back to home',
  };
}

interface ProtectedPagePreviewProps {
  pathname?: string;
}

export function ProtectedPagePreview({ pathname }: ProtectedPagePreviewProps) {
  const location = useLocation();
  const navigate = useIframeSafeNavigate();
  const { language } = useLanguage();
  const ar = language === 'ar';
  const activePath = pathname ?? location.pathname;
  const config = resolvePreviewConfig(activePath, ar);
  const returnTo = `${location.pathname}${location.search}${location.hash}`;
  const signInLabel = ar ? 'تسجيل الدخول' : 'Sign in';
  const unlockLabel = ar ? 'ما الذي سيفتحه الحساب؟' : 'What unlocks after sign-in?';

  return (
    <div style={{ width: '100%', maxWidth: 1040, margin: '32px auto 0', padding: `0 ${SPACE[4]}` }}>
      <section
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: R['3xl'],
          border: `1px solid ${config.accent}28`,
          background: `radial-gradient(circle at top left, ${config.accent}14, transparent 34%), linear-gradient(145deg, rgba(16,37,58,0.96) 0%, rgba(11,29,45,0.94) 62%, rgba(4,11,18,0.96) 100%)`,
          boxShadow: SH.lg,
          padding: `${SPACE[7]} ${SPACE[6]}`,
          color: C.text,
          fontFamily: F,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.04), transparent 30%, transparent 72%, rgba(255,255,255,0.02))',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', display: 'grid', gap: SPACE[6] }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              width: 'fit-content',
              minHeight: 34,
              padding: '0 14px',
              borderRadius: R.full,
              background: `${config.accent}14`,
              border: `1px solid ${config.accent}24`,
              color: config.accent,
              fontSize: TYPE.size.xs,
              fontWeight: TYPE.weight.bold,
              letterSpacing: TYPE.letterSpacing.wider,
              textTransform: 'uppercase',
            }}
          >
            <Lock size={14} />
            {config.eyebrow}
          </div>

          <div style={{ display: 'grid', gap: SPACE[3] }}>
            <h1
              style={{
                margin: 0,
                color: '#FFFFFF',
                fontSize: 'clamp(2rem, 4vw, 2.8rem)',
                lineHeight: TYPE.lineHeight.tight,
                letterSpacing: TYPE.letterSpacing.tighter,
                fontWeight: TYPE.weight.ultra,
                maxWidth: 760,
              }}
            >
              {config.title}
            </h1>
            <p
              style={{
                margin: 0,
                maxWidth: 760,
                color: C.textMuted,
                fontSize: TYPE.size.md,
                lineHeight: TYPE.lineHeight.loose,
              }}
            >
              {config.description}
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: SPACE[3],
            }}
          >
            {config.highlights.map(highlight => (
              <div
                key={highlight}
                style={{
                  borderRadius: R.xxl,
                  border: `1px solid ${config.accent}1f`,
                  background: 'rgba(255,255,255,0.035)',
                  boxShadow: SH.sm,
                  padding: `${SPACE[4]} ${SPACE[4]}`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    color: '#FFFFFF',
                    fontSize: TYPE.size.sm,
                    fontWeight: TYPE.weight.semibold,
                    lineHeight: TYPE.lineHeight.relaxed,
                  }}
                >
                  <Sparkles size={14} color={config.accent} />
                  <span>{highlight}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: SPACE[3] }}>
            <Button
              size="lg"
              onClick={() =>
                navigate(
                  `/app/auth?returnTo=${encodeURIComponent(returnTo || activePath || '/app')}`,
                )
              }
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {signInLabel}
              <ArrowRight size={16} />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate(config.secondaryTarget)}
              className="border-white/15 bg-white/5 text-white hover:bg-white/10"
            >
              {config.secondaryLabel}
            </Button>
          </div>

          <div
            style={{
              color: C.textDim,
              fontSize: TYPE.size.sm,
              lineHeight: TYPE.lineHeight.relaxed,
            }}
          >
            <strong style={{ color: C.textSub }}>{unlockLabel}</strong>{' '}
            {ar
              ? 'نُبقي تجربة واصل قابلة للاستكشاف قبل تسجيل الدخول، لكن الحجوزات والبيانات الشخصية والإجراءات الحساسة تبقى خلف الحساب.'
              : 'Wasel stays explorable before sign-in, but bookings, personal data, and sensitive actions stay behind your account.'}
          </div>
        </div>
      </section>
    </div>
  );
}

export default ProtectedPagePreview;

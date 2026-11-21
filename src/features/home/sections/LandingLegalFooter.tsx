import { BadgeCheck, Building2, CreditCard, LifeBuoy, ScrollText, ShieldCheck } from 'lucide-react';
import { WaselLogo } from '../../../components/wasel-ui';
import { C, R, TYPE } from '../HomePageShared';

interface LandingLegalFooterProps {
  ar: boolean;
  onNavigate: ( path: string, source?: string ) => void;
}

/**
 * Trust, legal and operational transparency footer for the landing page.
 *
 * Content rules (from the ground-truth audit):
 * - Every claim must be checkable: no invented ratings, user counts or
 *   coverage numbers. Anything not yet true is disclosed as in progress.
 * - Legal and support routes mirror public/robots.txt (crawlable pages).
 */
export function LandingLegalFooter( { ar, onNavigate }: LandingLegalFooterProps ) {
  const link = ( labelEn: string, labelAr: string, path: string, source: string ) => (
    <button
      type="button"
      onClick={ () => onNavigate( path, source ) }
      style={ {
        background: 'none',
        border: 'none',
        padding: 0,
        color: C.textMuted,
        cursor: 'pointer',
        fontSize: '0.875rem',
        textAlign: 'start',
      } }
    >
      { ar ? labelAr : labelEn }
    </button>
  );

  const columns = [
    {
      icon: ScrollText,
      title: ar ? 'القانوني' : 'Legal',
      items: [
        { en: 'Privacy Policy', arS: 'سياسة الخصوصية', path: '/app/privacy', src: 'footer_privacy' },
        { en: 'Terms of Service', arS: 'شروط الخدمة', path: '/app/terms', src: 'footer_terms' },
        { en: 'Security', arS: 'الأمان', path: '/app/security', src: 'footer_security' },
      ],
    },
    {
      icon: ShieldCheck,
      title: ar ? 'الثقة والأمان' : 'Trust & safety',
      items: [
        { en: 'Trust Center', arS: 'مركز الثقة', path: '/trust', src: 'footer_trust' },
        { en: 'Safety', arS: 'السلامة', path: '/app/safety', src: 'footer_safety' },
        { en: 'Verified identity model', arS: 'نموذج الهوية الموثقة', path: '/trust', src: 'footer_trust_model' },
      ],
    },
    {
      icon: LifeBuoy,
      title: ar ? 'الدعم' : 'Support',
      items: [
        { en: 'Support center', arS: 'مركز الدعم', path: '/app/support', src: 'footer_support' },
        { en: 'Popular routes', arS: 'المسارات الشائعة', path: '/app/routes', src: 'footer_routes' },
        { en: 'Get started', arS: 'ابدأ الآن', path: '/app/auth', src: 'footer_get_started' },
      ],
    },
  ];

  const transparency = [
    {
      icon: BadgeCheck,
      title: ar ? 'تحقق الهوية' : 'Identity verification',
      body: ar
        ? 'السائقون يكملون التحقق من الهوية قبل القبول، وشارة «موثق» تظهر للمتحقق منهم فقط.'
        : 'Drivers complete identity verification before approval; a Verified badge shows only for verified accounts.',
    },
    {
      icon: CreditCard,
      title: ar ? 'المدفوعات' : 'Payments',
      body: ar
        ? 'الدفع عبر المحفظة الرقمية. مبالغ الطرود محفوظة حتى تأكيد التسليم برمز تحقق.'
        : 'Digital-wallet payments. Package amounts are held until delivery is confirmed with a verification code.',
    },
    {
      icon: Building2,
      title: ar ? 'الترخيص' : 'Licensing',
      body: ar
        ? 'ترخيص نقل الركاب من هيئة تنظيم النقل قيد الإنجاز — نعرض حالته بشفافية عند اكتماله.'
        : 'The TRC ride-hailing licence is in progress; status will be published here once granted.',
    },
  ];

  return (
    <footer
      className="wasel-home-section"
      aria-label={ ar ? 'معلومات واصل القانونية والتشغيلية' : 'Wasel legal and operational information' }
      style={ {
        borderTop: `1px solid ${ C.borderFaint }`,
        marginTop: 40,
        paddingTop: 28,
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      } }
    >
      <div
        style={ {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
          gap: 20,
        } }
      >
        { transparency.map( item => {
          const Icon = item.icon;
          return (
            <div
              key={ item.title }
              style={ {
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                background: C.panel,
                border: `1px solid ${ C.borderFaint }`,
                borderRadius: R.lg,
                padding: '14px 16px',
              } }
            >
              <Icon size={ 18 } color={ C.cyan } aria-hidden="true" />
              <div>
                <strong style={ { color: C.text, fontSize: TYPE.size.sm } }>{ item.title }</strong>
                <p style={ { margin: '4px 0 0', color: C.textMuted, fontSize: '0.8rem', lineHeight: 1.55 } }>
                  { item.body }
                </p>
              </div>
            </div>
          );
        } ) }
      </div>

      <div
        style={ {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))',
          gap: 18,
        } }
      >
        { columns.map( column => {
          const Icon = column.icon;
          return (
            <nav key={ column.title } aria-label={ column.title } style={ { display: 'flex', flexDirection: 'column', gap: 8 } }>
              <div style={ { display: 'flex', alignItems: 'center', gap: 8, color: C.text }}>
                <Icon size={ 14 } color={ C.cyan } aria-hidden="true" />
                <strong style={ { fontSize: TYPE.size.sm } }>{ column.title }</strong>
              </div>
              { column.items.map( item => link( item.en, item.arS, item.path, item.src ) ) }
            </nav>
          );
        } ) }

        <div style={ { display: 'flex', flexDirection: 'column', gap: 8 } }>
          <WaselLogo size={ 32 } theme="light" variant="full" />
          <p style={ { margin: 0, color: C.textMuted, fontSize: '0.8rem', lineHeight: 1.55 } }>
            { ar
              ? 'واصل — شبكة تنقل ثنائية اللغة في عمّان، الأردن. أرقام المعاينة على الصفحة الرئيسية موسومة «عيّنة» حتى تحميل البيانات المباشرة.'
              : 'Wasel — a bilingual mobility network based in Amman, Jordan. Preview figures on the home page are labelled "Sample" until live data loads.' }
          </p>
        </div>
      </div>

      <div
        style={ {
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          justifyContent: 'space-between',
          alignItems: 'center',
          color: C.textDim,
          fontSize: '0.78rem',
        } }
      >
        <span>© 2026 Wasel · واصل — Amman, Jordan</span>
        <span>
          { ar
            ? 'متاح بالعربية والإنجليزية · الأسعار بالدينار الأردني'
            : 'Available in Arabic and English · Prices in Jordanian Dinar (JOD)' }
        </span>
      </div>
    </footer>
  );
}

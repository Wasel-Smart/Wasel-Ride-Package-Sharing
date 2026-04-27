import { CheckCircle2, CreditCard, Shield, UserRound } from 'lucide-react';
import { Button, Card, LayoutContainer, SectionWrapper } from '../../design-system/components';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { buildAuthPagePath } from '../../utils/authFlow';

function getProfileCompleteness(user: NonNullable<ReturnType<typeof useLocalAuth>['user']>) {
  const checks = [
    Boolean(user.name),
    Boolean(user.email),
    Boolean(user.phone),
    Boolean(user.phoneVerified),
    Boolean(user.emailVerified),
    Boolean(user.verified || user.sanadVerified),
  ];

  const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  return Math.max(score, 67);
}

export default function ProfilePage() {
  const { language } = useLanguage();
  const { user } = useLocalAuth();
  const navigate = useIframeSafeNavigate();
  const isArabic = language === 'ar';

  if (!user) {
    return (
      <LayoutContainer>
        <div className="ds-page ds-profile-page">
          <SectionWrapper
            description={
              isArabic
                ? 'سجل الدخول لعرض الهوية والثقة والإعدادات.'
                : 'Please sign in to view your profile.'
            }
            title={isArabic ? 'ملفي' : 'Profile'}
          >
            <div className="ds-stack">
              <div className="ds-list-item w-hover">
                <div className="ds-list-item__icon">
                  <UserRound size={16} />
                </div>
                <div>
                  <h2 className="ds-card__title">
                    {isArabic ? 'الدخول يفتح الحساب الكامل' : 'Sign in opens the full account'}
                  </h2>
                  <p className="ds-copy ds-copy--tight">
                    {isArabic
                      ? 'الحساب، الرحلات، والمحفظة كلها تستخدم نفس النظام.'
                      : 'Profile, trips, and wallet all live inside the same system.'}
                  </p>
                </div>
              </div>
              <Button onClick={() => navigate(buildAuthPagePath('signin'))}>
                {isArabic ? 'تسجيل الدخول' : 'Sign In'}
              </Button>
            </div>
          </SectionWrapper>
        </div>
      </LayoutContainer>
    );
  }

  const profileCompleteness = getProfileCompleteness(user);
  const trustLabel = user.verified || user.sanadVerified ? 'Strong trust' : 'Trust in progress';
  const joinedText = user.joinedAt
    ? new Date(user.joinedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'New member';

  return (
    <LayoutContainer>
      <div className="ds-page ds-profile-page">
        <SectionWrapper
          description={
            isArabic
              ? 'الهوية، الثقة، والمحفظة في مكان واحد.'
              : 'Identity, trust, and wallet status in one place.'
          }
          title={isArabic ? 'جاهزية الحساب' : 'Account readiness'}
        >
          <div className="ds-feature-grid">
            <Card className="w-hover">
              <h2 className="ds-card__title">
                {isArabic ? 'اكتمال الملف' : 'Profile completeness'}
              </h2>
              <p className="ds-section-title">{profileCompleteness}%</p>
              <p className="ds-copy ds-copy--tight">
                {isArabic
                  ? 'كلما زادت البيانات، زادت الثقة.'
                  : 'A more complete account improves trust.'}
              </p>
            </Card>
            <Card className="w-hover">
              <h2 className="ds-card__title">{isArabic ? 'المحفظة' : 'Wallet'}</h2>
              <p className="ds-section-title">{user.walletStatus ?? 'active'}</p>
              <p className="ds-copy ds-copy--tight">
                {isArabic ? 'الرصيد والمدفوعات جاهزان.' : 'Balance and payments stay ready here.'}
              </p>
            </Card>
            <Card className="w-hover">
              <h2 className="ds-card__title">{isArabic ? 'الثقة' : 'Trust'}</h2>
              <p className="ds-section-title">{trustLabel}</p>
              <p className="ds-copy ds-copy--tight">
                {isArabic ? `عضو منذ ${joinedText}.` : `Member since ${joinedText}.`}
              </p>
            </Card>
          </div>
        </SectionWrapper>

        <div className="ds-feature-grid">
          <Card className="w-hover">
            <div className="ds-list-item__icon">
              <CreditCard size={16} />
            </div>
            <h2 className="ds-card__title">Wallet & Payments</h2>
            <p className="ds-copy ds-copy--tight">
              Balance, payment state, and payout access stay on the same account.
            </p>
          </Card>
          <Card className="w-hover">
            <div className="ds-list-item__icon">
              <Shield size={16} />
            </div>
            <h2 className="ds-card__title">Trust & Verification</h2>
            <p className="ds-copy ds-copy--tight">
              Verified email, phone, and identity signals stay visible without clutter.
            </p>
          </Card>
          <Card className="w-hover">
            <div className="ds-list-item__icon">
              <CheckCircle2 size={16} />
            </div>
            <h2 className="ds-card__title">{isArabic ? 'الإجراء التالي' : 'Next action'}</h2>
            <p className="ds-copy ds-copy--tight">
              {isArabic
                ? 'افتح الإعدادات إذا كنت تريد تحديث الهاتف أو اللغة.'
                : 'Open settings to update phone, language, or security.'}
            </p>
            <Button onClick={() => navigate('/app/settings')} variant="secondary">
              {isArabic ? 'افتح الإعدادات' : 'Open settings'}
            </Button>
          </Card>
        </div>
      </div>
    </LayoutContainer>
  );
}

/**
 * JordanComplianceCenter – Wasel | واصل
 *
 * Comprehensive Jordan-specific legal & compliance UI including:
 *  1. Jordan Insurance Integration (JIC-compliant)
 *  2. Automated Driver Background Check (Sanad eKYC + Traffic Authority)
 *  3. Consent & ToS acceptance gate (required before first booking)
 *  4. PDPL (Jordan Personal Data Protection Law) compliance banner
 *  5. Insurance certificate viewer / status tracker
 *
 * All copy is bilingual AR/EN.  Uses existing LanguageContext.
 */

import { useState } from 'react';
import {
  Shield,
  CheckCircle,
  AlertCircle,
  Clock,
  FileText,
  Car,
  User,
  Lock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

// ── Types ────────────────────────────────────────────────────────────────────

export type VerificationStatus = 'not_started' | 'pending' | 'approved' | 'rejected' | 'expired';

export interface DriverComplianceProfile {
  driverId: string;
  fullName: string;
  nationalId?: string;
  /** Sanad eKYC verification status */
  sanadStatus: VerificationStatus;
  /** Jordan Traffic Authority license check */
  licenseStatus: VerificationStatus;
  licenseNumber?: string;
  licenseExpiry?: string;
  /** Background check via Jordan Police */
  backgroundCheckStatus: VerificationStatus;
  backgroundCheckDate?: string;
  /** Vehicle insurance (must be comprehensive, not TPL-only) */
  insuranceStatus: VerificationStatus;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  insuranceExpiry?: string;
  insuranceType?: 'comprehensive' | 'third_party' | 'unknown';
  /** Vehicle roadworthiness (Moayyana) */
  vehicleInspectionStatus: VerificationStatus;
  vehicleInspectionExpiry?: string;
  /** Overall readiness */
  readyToOperate: boolean;
  blockers: string[];
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface StatusBadgeProps {
  status: VerificationStatus;
  isAr: boolean;
}

function StatusBadge({ status, isAr }: StatusBadgeProps) {
  const config: Record<VerificationStatus, { label: string; labelAr: string; className: string; icon: React.ReactNode }> = {
    not_started: {
      label: 'Not started',
      labelAr: 'لم يبدأ',
      className: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
      icon: <Clock className="h-3 w-3" />,
    },
    pending: {
      label: 'Pending review',
      labelAr: 'قيد المراجعة',
      className: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
      icon: <Clock className="h-3 w-3" />,
    },
    approved: {
      label: 'Approved',
      labelAr: 'موافق عليه',
      className: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
      icon: <CheckCircle className="h-3 w-3" />,
    },
    rejected: {
      label: 'Rejected',
      labelAr: 'مرفوض',
      className: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
      icon: <AlertCircle className="h-3 w-3" />,
    },
    expired: {
      label: 'Expired',
      labelAr: 'منتهي الصلاحية',
      className: 'border-orange-400/30 bg-orange-400/10 text-orange-200',
      icon: <AlertCircle className="h-3 w-3" />,
    },
  };

  const { label, labelAr, className, icon } = config[status];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>
      {icon}
      {isAr ? labelAr : label}
    </span>
  );
}

interface CheckRowProps {
  icon: React.ReactNode;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  status: VerificationStatus;
  detail?: string;
  isAr: boolean;
  actionLabel?: string;
  actionLabelAr?: string;
  onAction?: () => void;
}

function CheckRow({
  icon,
  title,
  titleAr,
  description,
  descriptionAr,
  status,
  detail,
  isAr,
  actionLabel,
  actionLabelAr,
  onAction,
}: CheckRowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-lg bg-white/10 p-2 text-cyan-400">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm font-semibold text-white">{isAr ? titleAr : title}</p>
            <StatusBadge status={status} isAr={isAr} />
          </div>
          <p className="mt-1 text-xs text-slate-400 leading-relaxed">
            {isAr ? descriptionAr : description}
          </p>
          {detail && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition"
            >
              {isAr ? 'تفاصيل' : 'Details'}
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          )}
          {detail && expanded && (
            <p className="mt-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-300 leading-relaxed">
              {detail}
            </p>
          )}
        </div>
      </div>
      {onAction && (status === 'not_started' || status === 'rejected' || status === 'expired') && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onAction}
            className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition"
          >
            {isAr ? (actionLabelAr ?? 'ابدأ') : (actionLabel ?? 'Start')}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface JordanComplianceCenterProps {
  /** Pass a real profile from your backend; stub used when undefined */
  profile?: Partial<DriverComplianceProfile>;
  /** Called when user clicks to start a specific check */
  onStartCheck?: (checkType: string) => void;
}

export function JordanComplianceCenter({
  profile,
  onStartCheck,
}: JordanComplianceCenterProps) {
  const { language, dir } = useLanguage();
  const isAr = language === 'ar';

  // Merge with safe defaults for display
  const p: DriverComplianceProfile = {
    driverId: profile?.driverId ?? '',
    fullName: profile?.fullName ?? '',
    sanadStatus: profile?.sanadStatus ?? 'not_started',
    licenseStatus: profile?.licenseStatus ?? 'not_started',
    backgroundCheckStatus: profile?.backgroundCheckStatus ?? 'not_started',
    insuranceStatus: profile?.insuranceStatus ?? 'not_started',
    vehicleInspectionStatus: profile?.vehicleInspectionStatus ?? 'not_started',
    readyToOperate: profile?.readyToOperate ?? false,
    blockers: profile?.blockers ?? [],
    ...profile,
  };

  const allApproved = [
    p.sanadStatus,
    p.licenseStatus,
    p.backgroundCheckStatus,
    p.insuranceStatus,
    p.vehicleInspectionStatus,
  ].every((s) => s === 'approved');

  const completedCount = [
    p.sanadStatus,
    p.licenseStatus,
    p.backgroundCheckStatus,
    p.insuranceStatus,
    p.vehicleInspectionStatus,
  ].filter((s) => s === 'approved').length;

  const progressPct = Math.round((completedCount / 5) * 100);

  const heading = isAr ? 'مركز الامتثال القانوني' : 'Jordan Compliance Center';
  const subheading = isAr
    ? 'استوفِ جميع متطلبات الترخيص قبل قبول الرحلات'
    : 'Complete all requirements before accepting rides';

  return (
    <div
      dir={dir}
      className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="border-b border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-500/30 p-3">
              <Shield className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{heading}</h1>
              <p className="mt-1 text-sm text-slate-400">{subheading}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">
                {isAr
                  ? `${completedCount} من 5 متطلبات مكتملة`
                  : `${completedCount} of 5 requirements complete`}
              </span>
              <span className="text-xs font-bold text-cyan-400">{progressPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Readiness banner */}
          {allApproved ? (
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>
                {isAr
                  ? 'أنت جاهز لقبول الرحلات! جميع المتطلبات مستوفاة.'
                  : 'You\'re ready to accept rides! All requirements met.'}
              </span>
            </div>
          ) : p.blockers.length > 0 ? (
            <div className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-400/10 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-rose-200 mb-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {isAr ? 'يوجد موانع تحول دون تشغيل الرحلات:' : 'Blockers preventing ride operation:'}
              </div>
              <ul className="space-y-1 text-xs text-rose-300">
                {p.blockers.map((b, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="mt-0.5 shrink-0">•</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      {/* ── Checklist ─────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-4">

        {/* 1. Sanad eKYC */}
        <CheckRow
          icon={<User className="h-5 w-5" />}
          title="Sanad eKYC Identity Verification"
          titleAr="التحقق من الهوية عبر سند"
          description="Verify your Jordanian National ID through the Sanad government eKYC service. Required for all drivers and passengers."
          descriptionAr="تحقق من هويتك الوطنية الأردنية عبر خدمة سند الحكومية. مطلوب لجميع السائقين والركاب."
          status={p.sanadStatus}
          detail={isAr
            ? 'سند هي خدمة التحقق الإلكتروني من الهوية التابعة لوزارة الداخلية الأردنية. تستغرق العملية 2-5 دقائق وتتطلب كاميرا نشطة.'
            : 'Sanad is Jordan\'s Ministry of Interior eKYC service. The process takes 2-5 minutes and requires an active camera.'
          }
          isAr={isAr}
          actionLabel="Start Sanad Verification"
          actionLabelAr="ابدأ التحقق عبر سند"
          onAction={() => onStartCheck?.('sanad')}
        />

        {/* 2. Driver's License */}
        <CheckRow
          icon={<Car className="h-5 w-5" />}
          title="Driver's License (Jordan Traffic Authority)"
          titleAr="رخصة القيادة (مديرية الأمن العام)"
          description="Upload your valid Jordanian driving license. Must be class B or above. Wasel verifies against the Traffic Authority database."
          descriptionAr="ارفع رخصة القيادة الأردنية السارية. يجب أن تكون فئة ب أو أعلى. يتحقق واصل عبر قاعدة بيانات إدارة الترخيص."
          status={p.licenseStatus}
          detail={p.licenseNumber
            ? `${isAr ? 'رقم الرخصة: ' : 'License number: '}${p.licenseNumber}${p.licenseExpiry ? ` · ${isAr ? 'تنتهي: ' : 'Expires: '}${p.licenseExpiry}` : ''}`
            : undefined
          }
          isAr={isAr}
          actionLabel="Upload License"
          actionLabelAr="رفع رخصة القيادة"
          onAction={() => onStartCheck?.('license')}
        />

        {/* 3. Background Check */}
        <CheckRow
          icon={<FileText className="h-5 w-5" />}
          title="Criminal Background Check (Jordan Police)"
          titleAr="التحقق من السجل الجنائي (الأمن العام)"
          description="Automated check via Jordan's Public Security Directorate. Drivers must have a clean record for the past 5 years. Completed once per year."
          descriptionAr="فحص آلي عبر مديرية الأمن العام. يجب أن يكون السجل نظيفاً خلال آخر 5 سنوات. يُجدَّد سنوياً."
          status={p.backgroundCheckStatus}
          detail={p.backgroundCheckDate
            ? `${isAr ? 'تاريخ الفحص: ' : 'Check date: '}${p.backgroundCheckDate}`
            : undefined
          }
          isAr={isAr}
          actionLabel="Request Background Check"
          actionLabelAr="طلب فحص السجل الجنائي"
          onAction={() => onStartCheck?.('background_check')}
        />

        {/* 4. Vehicle Insurance */}
        <CheckRow
          icon={<Shield className="h-5 w-5" />}
          title="Comprehensive Vehicle Insurance (JIC-compliant)"
          titleAr="تأمين شامل على المركبة (متوافق مع JIC)"
          description="Comprehensive insurance (not third-party only) is required. Policy must be issued by a Jordan Insurance Commission-registered company and cover ride-sharing use."
          descriptionAr="يُشترط تأمين شامل (ليس طرف ثالث فقط). يجب أن يكون صادراً من شركة مرخصة لدى هيئة الإشراف على قطاع التأمين ويشمل استخدام مشاركة الرحلات."
          status={p.insuranceStatus}
          detail={p.insurancePolicyNumber
            ? [
                `${isAr ? 'رقم الوثيقة: ' : 'Policy: '}${p.insurancePolicyNumber}`,
                p.insuranceProvider ? ` · ${isAr ? 'الشركة: ' : 'Insurer: '}${p.insuranceProvider}` : '',
                p.insuranceExpiry ? ` · ${isAr ? 'تنتهي: ' : 'Expires: '}${p.insuranceExpiry}` : '',
                p.insuranceType === 'third_party'
                  ? ` ⚠️ ${isAr ? 'تأمين طرف ثالث فقط — يجب ترقيته إلى شامل' : 'Third-party only — upgrade to comprehensive required'}`
                  : '',
              ].join('')
            : undefined
          }
          isAr={isAr}
          actionLabel="Upload Insurance Certificate"
          actionLabelAr="رفع وثيقة التأمين"
          onAction={() => onStartCheck?.('insurance')}
        />

        {/* 5. Vehicle Inspection (Moayyana) */}
        <CheckRow
          icon={<Car className="h-5 w-5" />}
          title="Vehicle Roadworthiness (Moayyana – مُعَيَّنة)"
          titleAr="صلاحية المركبة للسير (معيَّنة)"
          description="Your vehicle must have a valid Moayyana (annual technical inspection) certificate. Vehicles older than 10 years are not permitted on the platform."
          descriptionAr="يجب أن تكون لدى مركبتك شهادة معيَّنة (فحص فني سنوي) سارية. لا يُسمح بالمركبات التي يزيد عمرها عن 10 سنوات."
          status={p.vehicleInspectionStatus}
          detail={p.vehicleInspectionExpiry
            ? `${isAr ? 'تنتهي الصلاحية: ' : 'Valid until: '}${p.vehicleInspectionExpiry}`
            : undefined
          }
          isAr={isAr}
          actionLabel="Upload Moayyana Certificate"
          actionLabelAr="رفع شهادة المعيَّنة"
          onAction={() => onStartCheck?.('vehicle_inspection')}
        />

        {/* ── Jordan Insurance Commission note ──────────────────────────── */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-start gap-3">
            <div className="shrink-0 rounded-lg bg-blue-500/20 border border-blue-500/30 p-2 text-blue-400">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {isAr ? 'تأمين واصل الإضافي' : 'Wasel Supplemental Insurance'}
              </h3>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                {isAr
                  ? 'يوفر واصل تغطية تأمينية إضافية لكل رحلة بقيمة 10,000 JOD للمسؤولية تجاه الركاب، بالإضافة لتأمين المركبة الأساسي. هذه التغطية مُضمَّنة في عمولة المنصة ولا تحتاج إلى دفع إضافي.'
                  : 'Wasel provides supplemental liability coverage of JOD 10,000 per ride for passenger liability, in addition to the driver\'s primary vehicle insurance. This coverage is included in the platform commission — no extra payment needed.'
                }
              </p>
              <a
                href="/legal/insurance"
                className="mt-2 inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition"
              >
                {isAr ? 'قرأ الشروط الكاملة' : 'Read full insurance terms'}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>

        {/* ── PDPL compliance note ───────────────────────────────────────── */}
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-xs text-amber-200 leading-relaxed">
          <p className="font-bold mb-1">
            {isAr ? 'إشعار قانون حماية البيانات الشخصية (PDPL)' : 'Personal Data Protection Law (PDPL) Notice'}
          </p>
          <p>
            {isAr
              ? 'وفقاً لقانون حماية البيانات الشخصية الأردني رقم 24 لسنة 2023، تُعالَج بياناتك للتحقق من الهوية وتشغيل خدمات واصل فقط. لديك الحق في الوصول والتصحيح والحذف. تواصل معنا على: privacy@wasel.jo'
              : 'Under Jordan\'s Personal Data Protection Law (No. 24 of 2023), your data is processed solely for identity verification and operating Wasel services. You have rights of access, rectification, and erasure. Contact us: privacy@wasel.jo'
            }
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Consent Gate ──────────────────────────────────────────────────────────────

/**
 * ConsentGate
 *
 * Full-screen modal that blocks access until the user explicitly consents
 * to ToS + Privacy Policy.  Must be shown before the first booking action.
 */

interface ConsentGateProps {
  /** Called when user accepts both documents */
  onAccept: () => void;
  /** Called when user declines (should sign them out) */
  onDecline?: () => void;
}

export function ConsentGate({ onAccept, onDecline }: ConsentGateProps) {
  const { language, dir } = useLanguage();
  const isAr = language === 'ar';

  const [tosChecked, setTosChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [ageChecked, setAgeChecked] = useState(false);

  const canAccept = tosChecked && privacyChecked && ageChecked;

  return (
    <div
      dir={dir}
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-lg rounded-3xl border border-white/15 bg-slate-900 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="rounded-xl bg-cyan-500/20 border border-cyan-500/30 p-2.5">
            <Shield className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              {isAr ? 'مرحباً بك في واصل' : 'Welcome to Wasel'}
            </h2>
            <p className="text-xs text-slate-400">
              {isAr ? 'يرجى قراءة الشروط والموافقة عليها للمتابعة' : 'Please review and accept to continue'}
            </p>
          </div>
        </div>

        {/* Checkboxes */}
        <div className="space-y-3 mb-6">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={tosChecked}
              onChange={(e) => setTosChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-cyan-500 cursor-pointer"
            />
            <span className="text-sm text-slate-300 leading-relaxed group-hover:text-white transition">
              {isAr ? (
                <>
                  أوافق على{' '}
                  <a href="/legal/terms" target="_blank" className="text-cyan-400 underline hover:text-cyan-300">
                    شروط الخدمة
                  </a>
                  {' '}الخاصة بواصل
                </>
              ) : (
                <>
                  I agree to Wasel's{' '}
                  <a href="/legal/terms" target="_blank" className="text-cyan-400 underline hover:text-cyan-300">
                    Terms of Service
                  </a>
                </>
              )}
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={privacyChecked}
              onChange={(e) => setPrivacyChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-cyan-500 cursor-pointer"
            />
            <span className="text-sm text-slate-300 leading-relaxed group-hover:text-white transition">
              {isAr ? (
                <>
                  أوافق على{' '}
                  <a href="/legal/privacy" target="_blank" className="text-cyan-400 underline hover:text-cyan-300">
                    سياسة الخصوصية
                  </a>
                  {' '}ومعالجة بياناتي وفق قانون حماية البيانات الشخصية الأردني
                </>
              ) : (
                <>
                  I agree to the{' '}
                  <a href="/legal/privacy" target="_blank" className="text-cyan-400 underline hover:text-cyan-300">
                    Privacy Policy
                  </a>
                  {' '}and processing of my data under Jordan's PDPL
                </>
              )}
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={ageChecked}
              onChange={(e) => setAgeChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-cyan-500 cursor-pointer"
            />
            <span className="text-sm text-slate-300 leading-relaxed group-hover:text-white transition">
              {isAr
                ? 'أؤكد أن عمري 18 عاماً أو أكثر'
                : 'I confirm I am 18 years of age or older'}
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {onDecline && (
            <button
              type="button"
              onClick={onDecline}
              className="flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-white/10 transition"
            >
              {isAr ? 'رفض' : 'Decline'}
            </button>
          )}
          <button
            type="button"
            onClick={onAccept}
            disabled={!canAccept}
            className="flex-1 rounded-full bg-cyan-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            {isAr ? 'أوافق وأكمل' : 'Accept & Continue'}
          </button>
        </div>

        <p className="mt-4 text-center text-[10px] text-slate-500 leading-relaxed">
          {isAr
            ? 'بالموافقة، تؤكد أنك قرأت وفهمت جميع الشروط. هذه الموافقة مسجَّلة وفق متطلبات القانون الأردني.'
            : 'By accepting, you confirm you have read and understood all terms. This consent is recorded per Jordanian law requirements.'}
        </p>
      </div>
    </div>
  );
}

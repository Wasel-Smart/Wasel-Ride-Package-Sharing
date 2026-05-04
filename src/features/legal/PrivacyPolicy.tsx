/**
 * Privacy Policy Page - Wasel | واصل
 * GDPR & MENA-compliant privacy policy
 */

import { useLanguage } from '../../contexts/LanguageContext';
import { Shield, Lock, Eye, FileText, Mail, Phone } from 'lucide-react';

export function PrivacyPolicy() {
  const { language, dir } = useLanguage();

  const content = {
    ar: {
      title: 'سياسة الخصوصية',
      subtitle: 'آخر تحديث: 16 مارس 2026',
      intro:
        'في واصل، نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية. توضح هذه السياسة كيف نجمع ونستخدم ونحمي معلوماتك.',

      sections: [
        {
          icon: FileText,
          title: '1. المعلومات التي نجمعها',
          content: [
            'معلومات الحساب: الاسم، البريد الإلكتروني، رقم الهاتف',
            'بيانات التحقق: رقم البطاقة الوطنية (سند) للتحقق الحكومي',
            'بيانات الموقع: لمطابقة الرحلات والتتبع المباشر',
            'معلومات الدفع: تفاصيل الدفع (مشفرة)',
            'بيانات الاستخدام: سجل الرحلات، التفضيلات، التقييمات',
          ],
        },
        {
          icon: Lock,
          title: '2. كيف نستخدم معلوماتك',
          content: [
            'توفير خدمات مشاركة الرحلات وتوصيل الطرود',
            'التحقق من هوية المستخدمين (سند eKYC)',
            'معالجة المدفوعات والحجوزات',
            'تحسين الأمان ومنع الاحتيال',
            'إرسال إشعارات الرحلات والتحديثات',
            'تخصيص تجربتك (أوقات الصلاة، تفضيلات الجنس)',
          ],
        },
        {
          icon: Shield,
          title: '3. حماية البيانات',
          content: [
            'تشفير SSL/TLS لجميع عمليات نقل البيانات',
            'تخزين البيانات الحساسة بتشفير AES-256',
            'مصادقة ثنائية لحسابات السائقين',
            'عمليات تدقيق أمنية منتظمة',
            'الوصول المحدود إلى البيانات الشخصية',
            'نسخ احتياطي آمن ومشفر',
          ],
        },
        {
          icon: Eye,
          title: '4. مشاركة البيانات',
          content: [
            'مع السائقين/الركاب: الاسم والصورة والتقييم فقط',
            'مع معالجات الدفع: تفاصيل الدفع المشفرة',
            'مع السلطات: عند الطلب القانوني فقط',
            'لا نبيع بياناتك أبداً لأطراف ثالثة',
            'لا نشارك البيانات للإعلانات',
          ],
        },
        {
          icon: FileText,
          title: '5. حقوقك',
          content: [
            'الوصول: طلب نسخة من بياناتك',
            'التصحيح: تحديث المعلومات غير الصحيحة',
            'الحذف: حذف حسابك وبياناتك',
            'النقل: تصدير بياناتك بصيغة قابلة للقراءة',
            'الاعتراض: رفض معالجة بيانات معينة',
            'السحب: إلغاء الموافقة في أي وقت',
          ],
        },
      ],

      contact: {
        title: 'اتصل بنا',
        subtitle: 'لأسئلة الخصوصية أو طلبات البيانات:',
        email: 'privacy@wasel.jo',
        phone: '+962 79 000 0000',
        address: 'عمان، الأردن',
      },

      compliance: {
        title: 'الامتثال القانوني',
        items: [
          'متوافق مع اللائحة العامة لحماية البيانات (GDPR)',
          'يتبع قوانين حماية البيانات الأردنية',
          'معتمد من هيئة تنظيم قطاع الاتصالات (TRC)',
          'تحديثات منتظمة للسياسة',
        ],
      },
    },
    en: {
      title: 'Privacy Policy',
      subtitle: 'Last Updated: March 16, 2026',
      intro:
        'At Wasel, we respect your privacy and are committed to protecting your personal data. This policy explains how we collect, use, and protect your information.',

      sections: [
        {
          icon: FileText,
          title: '1. Information We Collect',
          content: [
            'Account Information: Name, email, phone number',
            'Verification Data: National ID (Sanad) for government verification',
            'Location Data: For ride matching and live tracking',
            'Payment Information: Payment details (encrypted)',
            'Usage Data: Trip history, preferences, ratings',
          ],
        },
        {
          icon: Lock,
          title: '2. How We Use Your Information',
          content: [
            'Provide carpooling and package delivery services',
            'Verify user identities (Sanad eKYC)',
            'Process payments and bookings',
            'Improve security and prevent fraud',
            'Send trip notifications and updates',
            'Personalize your experience (prayer times, gender preferences)',
          ],
        },
        {
          icon: Shield,
          title: '3. Data Protection',
          content: [
            'SSL/TLS encryption for all data transmission',
            'AES-256 encryption for sensitive data storage',
            'Two-factor authentication for driver accounts',
            'Regular security audits',
            'Limited access to personal data',
            'Secure encrypted backups',
          ],
        },
        {
          icon: Eye,
          title: '4. Data Sharing',
          content: [
            'With drivers/passengers: Name, photo, rating only',
            'With payment processors: Encrypted payment details',
            'With authorities: Legal requests only',
            'We never sell your data to third parties',
            'No data sharing for advertising',
          ],
        },
        {
          icon: FileText,
          title: '5. Your Rights',
          content: [
            'Access: Request a copy of your data',
            'Rectification: Update incorrect information',
            'Erasure: Delete your account and data',
            'Portability: Export your data in readable format',
            'Object: Refuse certain data processing',
            'Withdraw: Cancel consent at any time',
          ],
        },
      ],

      contact: {
        title: 'Contact Us',
        subtitle: 'For privacy questions or data requests:',
        email: 'privacy@wasel.jo',
        phone: '+962 79 000 0000',
        address: 'Amman, Jordan',
      },

      compliance: {
        title: 'Legal Compliance',
        items: [
          'GDPR Compliant',
          'Follows Jordanian Data Protection Laws',
          'TRC (Telecommunications Regulatory Commission) Certified',
          'Regular policy updates',
        ],
      },
    },
  };

  const t = content[language as 'ar' | 'en'];

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"
      dir={dir}
    >
      {/* Header */}
      <div className="border-b border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 border border-teal-500/30">
              <Shield className="w-6 h-6 text-teal-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">{t.title}</h1>
              <p className="text-sm text-slate-400 mt-1">{t.subtitle}</p>
            </div>
          </div>
          <p className="text-slate-300 leading-relaxed">{t.intro}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Sections */}
        <div className="space-y-8 mb-12">
          {t.sections.map((section, idx) => (
            <div
              key={idx}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm"
            >
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-teal-500/20 border border-teal-500/30 shrink-0">
                  <section.icon className="w-5 h-5 text-teal-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-white mb-4">{section.title}</h2>
                  <ul className="space-y-2">
                    {section.content.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-slate-300">
                        <span className="text-teal-400 mt-1.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div className="bg-gradient-to-br from-teal-500/10 to-emerald-500/10 border border-teal-500/30 rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="w-6 h-6 text-teal-400" />
            <h2 className="text-xl font-bold text-white">{t.contact.title}</h2>
          </div>
          <p className="text-slate-300 mb-4">{t.contact.subtitle}</p>
          <div className="space-y-2">
            <a
              href={`mailto:${t.contact.email}`}
              className="flex items-center gap-2 text-teal-400 hover:text-teal-300"
            >
              <Mail className="w-4 h-4" />
              <span>{t.contact.email}</span>
            </a>
            <a
              href={`tel:${t.contact.phone.replace(/\s/g, '')}`}
              className="flex items-center gap-2 text-teal-400 hover:text-teal-300"
            >
              <Phone className="w-4 h-4" />
              <span>{t.contact.phone}</span>
            </a>
            <p className="text-slate-400 text-sm">{t.contact.address}</p>
          </div>
        </div>

        {/* Compliance */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">{t.compliance.title}</h2>
          <ul className="space-y-2">
            {t.compliance.items.map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-slate-300">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

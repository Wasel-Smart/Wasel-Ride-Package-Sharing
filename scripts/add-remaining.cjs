const fs = require('fs');
const p = 'C:/Users/user/OneDrive/Desktop/Wdoubleme/scripts/new-translations.json';
const obj = JSON.parse(fs.readFileSync(p, 'utf8'));
const add = {
  'Page Error': 'خطأ في الصفحة',
  'This page encountered an error.': 'واجهت هذه الصفحة خطأً.',
  'Go to Dashboard': 'الذهاب للوحة التحكم',
  'This feature is temporarily unavailable. Please try again later.': 'هذه الميزة غير متاحة مؤقتاً. يرجى المحاولة لاحقاً.',
  'Review security': 'مراجعة الأمان',
  'Contact support': 'التواصل مع الدعم',
  'Manage account security': 'إدارة أمان الحساب',
  'Open trust center': 'فتح مركز الثقة',
  'Security is not hidden in policy copy. It appears in verification gates, wallet standing, support escalation, and consent-based performance monitoring.': 'الأمان ليس مخفياً في نص السياسة. يظهر في بوابات التوثيق ووضع المحفظة وتصعيد الدعم والمراقبة القائمة على الموافقة.',
  'Open support': 'فتح الدعم',
  'Live routes, booking conversions, package flow, and growth events are merged into the same operating surface so each page explains itself faster.': 'تندمج المسارات الحيّة وتحويلات الحجز وتدفّق الطرود وأحداث النمو في نفس السطح التشغيلي، فتبدأ كل صفحة بشرح نفسها أسرع.',
  'Open my trips': 'فتح رحلاتي',
  'Account settings': 'إعدادات الحساب',
  'For urgent safety concerns, use the in-app SOS flow or your local emergency number first, then open Wasel support with the trip context.': 'للشواغل الأمنية العاجلة، استخدم تدفّق SOS داخل التطبيق أو رقم الطوارئ المحلي أولاً، ثم افتح دعم واصل مع سياق الرحلة.',
};
let n = 0;
for (const k of Object.keys(add)) {
  if (!(k in obj)) { obj[k] = add[k]; n++; }
}
fs.writeFileSync(p, JSON.stringify(obj, null, 2));
console.log('added', n, 'entries; total', Object.keys(obj).length);

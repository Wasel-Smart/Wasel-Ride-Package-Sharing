import { C } from '../../../utils/wasel-ds';
import type { CorridorBetaPlan } from '../../../services/corridorBeta';

const CITY_LABELS_AR: Record<string, string> = {
  Amman: 'عمّان',
  Aqaba: 'العقبة',
  Irbid: 'إربد',
  Zarqa: 'الزرقاء',
  'Dead Sea': 'البحر الميت',
  Karak: 'الكرك',
  Madaba: 'مادبا',
  Petra: 'البتراء',
  Jerash: 'جرش',
  Mafraq: 'المفرق',
  Salt: import.meta.env.VITE_CORRIDOR_SALT_LABEL || 'السلط',
};

export function stageLabel(
  stage: CorridorBetaPlan['focusCorridors'][number]['stage'],
  ar: boolean,
): string {
  if (stage === 'expand') {return ar ? 'جاهز للتوسع' : 'Ready to expand';}
  if (stage === 'prove') {return ar ? 'اثبت التكرار' : 'Prove repeat rides';}
  return ar ? 'ضيّق التركيز' : 'Narrow focus';
}

export function stageColor(
  stage: CorridorBetaPlan['focusCorridors'][number]['stage'],
): string {
  if (stage === 'expand') {return C.green;}
  if (stage === 'prove') {return C.gold;}
  return C.cyan;
}

export function corridorLabel(label: string, ar: boolean): string {
  if (!ar) {return label;}
  const [from, to] = label.split(' to ');
  if (!from || !to) {return label;}
  return `${CITY_LABELS_AR[from] ?? from} إلى ${CITY_LABELS_AR[to] ?? to}`;
}

export function corridorReason(label: string, ar: boolean): string {
  if (!ar) {return label;}
  if (label === 'Observed ride data clears the corridor expansion gate.') {
    return 'بيانات الرحلات المرصودة تجاوزت بوابة توسيع المسار.';
  }
  if (
    label ===
    'This corridor is ready for controlled expansion because rides, repeat behavior, and supply are all stable.'
  ) {
    return 'هذا المسار جاهز لتوسع مضبوط لأن الرحلات والتكرار والعرض كلها مستقرة.';
  }
  if (label.startsWith('Narrow the beta until')) {
    return 'ضيّق التجربة إلى أن تصبح الرحلات الأسبوعية، التكرار، ثبات العرض، وثبات ثلاثة أسابيع أقوى.';
  }
  return label;
}

export function corridorNextAction(label: string, ar: boolean): string {
  if (!ar) {return label;}
  if (label === 'Open the next corridor only after the same three-week gate passes.') {
    return 'افتح المسار التالي فقط بعد اجتياز نفس بوابة الثلاثة أسابيع.';
  }
  if (label === 'Run one route, one pickup node, and one rider segment until demand concentrates.') {
    return 'شغّل مساراً واحداً، نقطة ركوب واحدة، وشريحة ركاب واحدة إلى أن يتركز الطلب.';
  }
  if (label === 'Open controlled expansion with the same trust and supply gates.') {
    return 'افتح توسعاً مضبوطاً بنفس بوابات الثقة والعرض.';
  }
  return label;
}

export function metricLabel(label: string, ar: boolean): string {
  if (label === 'weekly rides') {return ar ? 'رحلات أسبوعية' : 'weekly rides';}
  if (label === 'repeat ride rate') {return ar ? 'نسبة التكرار' : 'repeat ride rate';}
  if (label === 'supply reliability') {return ar ? 'ثبات العرض' : 'supply reliability';}
  return ar ? 'ثبات ثلاث أسابيع' : 'three-week consistency';
}
import { C, _TYPE } from '../../../utils/wasel-ds';
import { tx } from '../../../locales/tx';
import type { CorridorBetaPlan } from '../../../services/corridorBeta';

export type CorridorStage = CorridorBetaPlan['focusCorridors'][number]['stage'];

export function stageLabel(stage: CorridorStage, ar: boolean): string {
  if (stage === 'expand') return ar ? tx('homePage.corridor_beta_ready_to_expand') : tx('homePage.corridor_beta_ready_to_expand');
  if (stage === 'prove') return ar ? tx('homePage.corridor_beta_prove_repeat') : tx('homePage.corridor_beta_prove_repeat');
  return ar ? tx('homePage.corridor_beta_narrow_focus') : tx('homePage.corridor_beta_narrow_focus');
}

export function metricLabel(label: string, ar: boolean): string {
  if (label === 'weekly rides') return ar ? tx('homePage.corridor_beta_rides_week') : tx('homePage.corridor_beta_rides_week');
  if (label === 'repeat ride rate') return ar ? tx('homePage.corridor_beta_repeat') : tx('homePage.corridor_beta_repeat');
  if (label === 'supply reliability') return ar ? tx('homePage.corridor_beta_three_week') : tx('homePage.corridor_beta_three_week');
  return ar ? tx('homePage.corridor_beta_three_week') : tx('homePage.corridor_beta_three_week');
}

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

export function corridorLabel(label: string, ar: boolean): string {
  if (!ar) return label;
  const [from, to] = label.split(' to ');
  if (!from || !to) return label;
  return `${CITY_LABELS_AR[from] ?? from} إلى ${CITY_LABELS_AR[to] ?? to}`;
}

export function corridorReason(label: string, ar: boolean): string {
  if (!ar) return label;
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
  if (!ar) return label;
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

export function stageColor(stage: CorridorStage): string {
  switch (stage) {
    case 'expand':
      return C.green;
    case 'prove':
      return C.gold;
    case 'narrow':
    default:
      return C.cyan;
  }
}

export interface ServicePriorityItem {
  id: string;
  label: string;
  labelAr: string;
  description: string;
  descriptionAr: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
}

export const SERVICE_PRIORITY_GROUPS: { priority: ServicePriorityItem['priority']; items: ServicePriorityItem[] }[] = [
  {
    priority: 'P1',
    items: [
      {
        id: 'mobility-os',
        label: 'Mobility OS',
        labelAr: 'نظام الحركة',
        description: 'Real-time control layer for the network, supply balancing, and corridor orchestration.',
        descriptionAr: 'طبقة التحكم الفوري بالشبكة وتوازن العرض وإدارة الممرات.',
        priority: 'P1',
      },
      {
        id: 'find-ride',
        label: 'Find Ride',
        labelAr: 'ابحث عن رحلة',
        description: 'Core marketplace demand capture for intercity movement.',
        descriptionAr: 'منصة الطلب الأساسية للتنقل بين المدن.',
        priority: 'P1',
      },
      {
        id: 'offer-ride',
        label: 'Offer Ride',
        labelAr: 'أضف رحلة',
        description: 'Primary supply generation for seats and blended trip capacity.',
        descriptionAr: 'توليد العرض الأساسي للمقاعد والسعة التشغيلية.',
        priority: 'P1',
      },
    ],
  },
  {
    priority: 'P2',
    items: [
      {
        id: 'packages',
        label: 'Packages',
        labelAr: 'الطرود',
        description: 'High-priority revenue layer for parcel movement on active corridors.',
        descriptionAr: 'طبقة إيراد عالية لتحريك الطرود على الممرات النشطة.',
        priority: 'P2',
      },
      {
        id: 'bus',
        label: 'WaselBus',
        labelAr: 'واصل باص',
        description: 'Alternative transport capacity for predictable schedules.',
        descriptionAr: 'سعة نقل بديلة للجداول المتوقعة.',
        priority: 'P2',
      },
      {
        id: 'driver',
        label: 'Driver Dashboard',
        labelAr: 'لوحة السائق',
        description: 'Driver retention and supply health management.',
        descriptionAr: 'إدارة استبقاء السائقين وصحة العرض.',
        priority: 'P2',
      },
      {
        id: 'payments',
        label: 'Payments',
        labelAr: 'المدفوعات',
        description: 'Transaction trust and settlement continuity.',
        descriptionAr: 'ثقة المعاملات واستمرارية التسوية.',
        priority: 'P2',
      },
    ],
  },
  {
    priority: 'P3',
    items: [
      {
        id: 'analytics',
        label: 'Analytics',
        labelAr: 'التحليلات',
        description: 'Optimization, reporting, and learning surface.',
        descriptionAr: 'واجهة التحسين والتقارير والتعلم التشغيلي.',
        priority: 'P3',
      },
      {
        id: 'safety',
        label: 'Safety Center',
        labelAr: 'مركز السلامة',
        description: 'Trust and incident readiness.',
        descriptionAr: 'الجاهزية للثقة والحوادث.',
        priority: 'P3',
      },
      {
        id: 'moderation',
        label: 'Moderation',
        labelAr: 'الإشراف',
        description: 'Content and account quality control.',
        descriptionAr: 'ضبط جودة المحتوى والحسابات.',
        priority: 'P3',
      },
      {
        id: 'plus',
        label: 'Wasel Plus',
        labelAr: 'واصل بلس',
        description: 'Premium service and revenue expansion.',
        descriptionAr: 'الخدمة المميزة وتوسيع الإيرادات.',
        priority: 'P3',
      },
      {
        id: 'profile',
        label: 'Profile',
        labelAr: 'الملف الشخصي',
        description: 'Identity, verification, and account management.',
        descriptionAr: 'الهوية والتحقق وإدارة الحساب.',
        priority: 'P3',
      },
    ],
  },
  {
    priority: 'P4',
    items: [
      {
        id: 'specialized-admin',
        label: 'Specialized and admin services',
        labelAr: 'الخدمات المتخصصة والإدارية',
        description: 'Lower-frequency support and back-office workflows.',
        descriptionAr: 'عمليات الدعم والخلفية منخفضة التكرار.',
        priority: 'P4',
      },
    ],
  },
];

export const P1_CRITICAL_SERVICES =
  SERVICE_PRIORITY_GROUPS.find((group) => group.priority === 'P1')?.items ?? [];

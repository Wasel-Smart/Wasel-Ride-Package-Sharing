import { getConfig, getSupportEmailUrl, getSupportPhoneUrl, getWhatsAppSupportUrl } from '../../utils/env';

export interface WaselPresenceSignal {
  id: string;
  tone: 'cyan' | 'green' | 'gold';
  label: string;
  labelAr: string;
  value: string;
  valueAr: string;
}

export interface WaselContactAction {
  id: string;
  label: string;
  labelAr: string;
  href: string;
}

function normalizePhone(raw: string) {
  const digits = raw.replace(/[^\d+]/g, '').replace(/^\+/, '');
  return digits;
}

function formatJordanPhone(raw: string) {
  const digits = normalizePhone(raw);

  if (!digits) return '';
  if (digits.startsWith('962') && digits.length === 12) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  if (digits.length > 3) {
    return `+${digits}`;
  }
  return raw;
}

function createContactActions(): WaselContactAction[] {
  const config = getConfig();
  const actions: WaselContactAction[] = [];
  const phoneHref = getSupportPhoneUrl();
  const whatsappHref = getWhatsAppSupportUrl('Hi Wasel');
  const emailHref = getSupportEmailUrl('Wasel support');

  if (phoneHref) {
    actions.push({
      id: 'call',
      label: 'Call support',
      labelAr: 'اتصل بالدعم',
      href: phoneHref,
    });
  }

  if (whatsappHref) {
    actions.push({
      id: 'whatsapp',
      label: 'WhatsApp',
      labelAr: 'واتساب',
      href: whatsappHref,
    });
  }

  if (emailHref || config.supportEmail) {
    actions.push({
      id: 'email',
      label: 'Email',
      labelAr: 'البريد',
      href: emailHref || `mailto:${config.supportEmail}`,
    });
  }

  return actions;
}

export function getWaselPresenceProfile() {
  const config = getConfig();
  const supportPhone = config.supportPhoneNumber || config.supportWhatsAppNumber;

  return {
    brandName: 'Wasel',
    founderName: config.founderName || 'Wasel founder',
    supportPhoneDisplay: supportPhone ? formatJordanPhone(supportPhone) : '',
    supportEmail: config.supportEmail,
    businessAddress: config.businessAddress,
    businessAddressAr: config.businessAddressAr,
    whyWaselExists: {
      en: 'Wasel exists because one route in Jordan should not require four disconnected products. Riders, drivers, parcels, and return handoffs all live on the same corridor, so the product should help people book, track, and trust that corridor as one living system.',
      ar: 'واسل موجود لأن المسار الواحد في الأردن لا يجب أن يحتاج إلى أربع خدمات منفصلة. الراكب والسائق والطرد والمرتجع كلهم يعيشون على نفس الممر، لذلك يجب أن يساعد المنتج الناس على الحجز والتتبع والثقة بهذا المسار كنظام حي واحد.',
    },
    founderStory: {
      en: 'I built Wasel after seeing the same route solve multiple needs at once: a person needed a better trip, a driver needed better seat fill, and a business needed a trusted handoff for light goods. Wasel started as a decision to treat that route as one engine instead of a pile of separate apps.',
      ar: 'بنيت واصل بعد أن رأيت كيف يحل المسار نفسه أكثر من حاجة في وقت واحد: شخص يحتاج رحلة أفضل، وسائق يحتاج امتلاء أفضل للمقاعد، وتاجر يحتاج تسليما موثوقا لبضاعة خفيفة. بدأ واصل كقرار للتعامل مع هذا المسار كمحرك واحد بدلا من مجموعة تطبيقات منفصلة.',
    },
    proofOfLife: {
      en: 'Proof of Life',
      ar: 'إثبات الحياة',
    },
    actionSummary: {
      en: 'Book, track, offer rides, and move packages from one dashboard.',
      ar: 'احجز وتابع واعرض رحلة وحرّك الطرود من لوحة واحدة.',
    },
    contactActions: createContactActions(),
  };
}

export function getWaselPresenceSignals(): WaselPresenceSignal[] {
  const profile = getWaselPresenceProfile();
  const contactModes = [
    profile.supportPhoneDisplay ? 'call' : null,
    profile.supportEmail ? 'email' : null,
    profile.contactActions.some((action) => action.id === 'whatsapp') ? 'WhatsApp' : null,
  ].filter(Boolean);

  return [
    {
      id: 'life-network',
      tone: 'cyan',
      label: 'Live network',
      labelAr: 'الشبكة الحية',
      value: 'Routes, trust, and tracking are active',
      valueAr: 'المسارات والثقة والتتبع تعمل الآن',
    },
    {
      id: 'life-actions',
      tone: 'green',
      label: 'Real actions',
      labelAr: 'إجراءات حقيقية',
      value: 'Book, track, offer ride, send package',
      valueAr: 'احجز وتابع واعرض رحلة وأرسل طردا',
    },
    {
      id: 'life-support',
      tone: 'gold',
      label: 'Human support',
      labelAr: 'دعم بشري',
      value: contactModes.length > 0 ? `${contactModes.join(' + ')} available` : 'In-app support ready',
      valueAr: contactModes.length > 0 ? 'اتصال وبريد وواتساب متاح' : 'الدعم داخل التطبيق جاهز',
    },
  ];
}


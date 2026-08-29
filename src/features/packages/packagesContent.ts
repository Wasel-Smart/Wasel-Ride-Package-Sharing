export const PACKAGE_WEIGHT_OPTIONS = ['<1 kg', '1-3 kg', '3-5 kg', '5-10 kg'] as const;

export const PACKAGE_SEND_STEPS = [
  { title: '1. Share OTP', desc: 'Give the handoff code to the rider only at pickup.' },
  { title: '2. Confirm pickup', desc: 'Mark the parcel as in transit once the rider has it.' },
  { title: '3. Confirm delivery', desc: 'Close the trip only when the receiver gets the parcel.' },
] as const;

export const PACKAGE_SEND_STEPS_AR = [
  { title: '١. شارك رمز التسليم', desc: 'اعطِ رمز التسليم للراكب فقط عند الاستلام.' },
  { title: '٢. أكد الاستلام', desc: 'علّم الطرد أنه بالطريق بعد ما يستلمه الراكب.' },
  { title: '٣. أكد التسليم', desc: 'أغلق الرحلة فقط لما يستلم المستلم الطرد.' },
] as const;

export const PACKAGE_EXCELLENCE_POINTS = [
  {
    title: 'Recipient-ready handoff',
    desc: 'Name, phone, and the handoff code are captured before pickup starts.',
  },
  {
    title: 'Connected ride matching',
    desc: 'Existing rides are checked before a new logistics lane is created.',
  },
  {
    title: 'Single tracking story',
    desc: 'One tracking ID follows the request from creation to delivery.',
  },
] as const;

export const PACKAGE_EXCELLENCE_POINTS_AR = [
  {
    title: 'تسليم جاهز للمستلم',
    desc: 'الاسم، الهاتف، ورمز التسليم محفوظين قبل بدء الاستلام.',
  },
  {
    title: 'مطابقة مع مشوار قائم',
    desc: 'نفحص الرحلات الحالية قبل إنشاء مسار توصيل جديد.',
  },
  {
    title: 'قصة تتبع واحدة',
    desc: 'رقم تتبع واحد يرافق الطلب من الإنشاء حتى التسليم.',
  },
] as const;

export const PACKAGE_RETURN_STEPS = [
  { title: 'Create the return', desc: 'Add pickup city, return destination, and package notes.' },
  { title: 'Match to a ride', desc: 'We prioritize posted rides already accepting packages.' },
  {
    title: 'Track every handoff',
    desc: 'Use one tracking ID for pickup, transit, and return delivery.',
  },
] as const;

export const PACKAGE_RETURN_STEPS_AR = [
  { title: 'أنشئ الإرجاع', desc: 'أضف مدينة الاستلام، وجهة الإرجاع، وملاحظات الطرد.' },
  { title: 'طابقه مع مشوار', desc: 'نعطي الأولوية للرحلات المنشورة التي تقبل الطرود.' },
  {
    title: 'تتبع كل تسليم',
    desc: 'استخدم رقم تتبع واحد للاستلام، النقل، وتسليم الإرجاع.',
  },
] as const;

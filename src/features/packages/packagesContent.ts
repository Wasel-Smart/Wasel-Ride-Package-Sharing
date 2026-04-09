export const PACKAGE_WEIGHT_OPTIONS = ['<1 kg', '1-3 kg', '3-5 kg', '5-10 kg'] as const;

export const PACKAGE_SEND_STEPS = [
  { title: '1. Share OTP', desc: 'Share it at pickup.' },
  { title: '2. Confirm pickup', desc: 'Mark it in transit.' },
  { title: '3. Confirm delivery', desc: 'Close when delivered.' },
] as const;

export const PACKAGE_EXCELLENCE_POINTS = [
  { title: 'Recipient-ready handoff', desc: 'Name, phone, and code are ready.' },
  { title: 'Connected ride matching', desc: 'Live rides are checked first.' },
  { title: 'Single tracking story', desc: 'One tracking ID from start to finish.' },
] as const;

export const PACKAGE_RETURN_STEPS = [
  { title: 'Create the return', desc: 'Add the route and note.' },
  { title: 'Match to a ride', desc: 'We check package-ready rides first.' },
  { title: 'Track every handoff', desc: 'One tracking ID for the full return.' },
] as const;

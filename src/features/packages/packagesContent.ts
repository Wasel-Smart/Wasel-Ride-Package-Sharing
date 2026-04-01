export const PACKAGE_WEIGHT_OPTIONS = ['<1 kg', '1-3 kg', '3-5 kg', '5-10 kg'] as const;

export const PACKAGE_SEND_STEPS = [
  { title: '1. Share OTP', desc: 'Give the handoff code to the rider only at pickup.' },
  { title: '2. Confirm pickup', desc: 'Mark the parcel as in transit once the rider has it.' },
  { title: '3. Confirm delivery', desc: 'Close the trip only when the receiver gets the parcel.' },
] as const;

export const PACKAGE_EXCELLENCE_POINTS = [
  { title: 'Recipient-ready handoff', desc: 'Name, phone, and the handoff code are captured before pickup starts.' },
  { title: 'Connected ride matching', desc: 'Existing rides are checked before a new logistics lane is created.' },
  { title: 'Single tracking story', desc: 'One tracking ID follows the request from creation to delivery.' },
] as const;

export const PACKAGE_RETURN_STEPS = [
  { title: 'Create the return', desc: 'Add pickup city, return destination, and package notes.' },
  { title: 'Match to a ride', desc: 'We prioritize posted rides already accepting packages.' },
  { title: 'Track every handoff', desc: 'Use one tracking ID for pickup, transit, and return delivery.' },
] as const;

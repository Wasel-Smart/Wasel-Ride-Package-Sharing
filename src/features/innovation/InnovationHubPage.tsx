import { type ReactNode, useMemo } from 'react';
import {
  Activity,
  BarChart3,
  Brain,
  CircuitBoard,
  Globe2,
  Layers,
  Package,
  Route,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeTextTree } from '../../utils/textEncoding';
import { C, F, GRAD_AURORA, SH } from '../../utils/wasel-ds';

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   Design tokens
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const BORD = `1px solid ${C.border}`;
const CARD_BG = 'linear-gradient(180deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.02) 100%)';

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   Copy
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const COPY = normalizeTextTree({
  en: {
    eyebrow: 'Wasel Â· Innovation Hub',
    title: "Where Jordan's mobility future is being built.",
    subtitle:
      'The innovation layer sits underneath every ride, package, and bus seat on the Wasel network â€” turning corridor data into decisions, and decisions into movement.',
    pillars: 'Core innovation pillars',
    metrics: 'Live intelligence metrics',
    roadmap: 'Roadmap signal',
    aiSection: 'AI and demand intelligence',
    aiBody:
      "Wasel's demand engine processes corridor signals in real time to predict where supply is needed before riders search. Price recommendations, seat allocation, and backhaul matching are all driven by this layer.",
    trustSection: 'Trust and safety layer',
    trustBody:
      'Every completed trip contributes to the trust graph. Identity verification, behaviour scoring, and guardian visibility for school routes are first-class features â€” not afterthoughts.',
    networkSection: 'Network compounding',
    networkBody:
      'Each new route added to the Wasel graph increases the value of every existing route. Packages find more carriers, riders find more seats, and the system gets cheaper and faster as it grows.',
    menaSection: 'MENA-first design',
    menaBody:
      'WhatsApp-native coordination, Arabic-first UI, JOD pricing, Jordan PDPL compliance, and offline-tolerant architecture for variable connectivity corridors.',
  },
  ar: {
    eyebrow: 'ÙˆØ§ØµÙ„ Â· Ù…Ø±ÙƒØ² Ø§Ù„Ø§Ø¨ØªÙƒØ§Ø±',
    title: 'Ù‡Ù†Ø§ ÙŠÙØ¨Ù†Ù‰ Ù…Ø³ØªÙ‚Ø¨Ù„ Ø§Ù„ØªÙ†Ù‚Ù„ ÙÙŠ Ø§Ù„Ø£Ø±Ø¯Ù†.',
    subtitle:
      'Ø·Ø¨Ù‚Ø© Ø§Ù„Ø§Ø¨ØªÙƒØ§Ø± ØªØ¹Ù…Ù„ Ø®Ù„Ù ÙƒÙ„ Ø±Ø­Ù„Ø© ÙˆØ·Ø±Ø¯ ÙˆÙ…Ù‚Ø¹Ø¯ Ø­Ø§ÙÙ„Ø© Ø¹Ù„Ù‰ Ø´Ø¨ÙƒØ© ÙˆØ§ØµÙ„ â€” ØªØ­ÙˆÙ‘Ù„ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ù…Ø±Ø§Øª Ø¥Ù„Ù‰ Ù‚Ø±Ø§Ø±Ø§ØªØŒ ÙˆØ§Ù„Ù‚Ø±Ø§Ø±Ø§Øª Ø¥Ù„Ù‰ Ø­Ø±ÙƒØ©.',
    pillars: 'Ù…Ø­Ø§ÙˆØ± Ø§Ù„Ø§Ø¨ØªÙƒØ§Ø± Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ©',
    metrics: 'Ù…Ù‚Ø§ÙŠÙŠØ³ Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø­ÙŠ',
    roadmap: 'Ø¥Ø´Ø§Ø±Ø© Ø§Ù„Ø®Ø§Ø±Ø·Ø© Ø§Ù„Ø²Ù…Ù†ÙŠØ©',
    aiSection: 'Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ ÙˆØ°ÙƒØ§Ø¡ Ø§Ù„Ø·Ù„Ø¨',
    aiBody:
      'ØªØ¹Ø§Ù„Ø¬ Ù…Ø­Ø±ÙƒØ© Ø§Ù„Ø·Ù„Ø¨ ÙÙŠ ÙˆØ§ØµÙ„ Ø¥Ø´Ø§Ø±Ø§Øª Ø§Ù„Ù…Ù…Ø±Ø§Øª ÙÙŠ Ø§Ù„ÙˆÙ‚Øª Ø§Ù„ÙØ¹Ù„ÙŠ Ù„Ù„ØªÙ†Ø¨Ø¤ Ø¨Ù…ÙƒØ§Ù† Ø§Ù„Ø­Ø§Ø¬Ø© Ø¥Ù„Ù‰ Ø§Ù„Ø¹Ø±Ø¶ Ù‚Ø¨Ù„ Ø£Ù† ÙŠØ¨Ø­Ø« Ø§Ù„Ø±ÙƒØ§Ø¨. ØªÙˆØµÙŠØ§Øª Ø§Ù„Ø£Ø³Ø¹Ø§Ø± ÙˆØªØ®ØµÙŠØµ Ø§Ù„Ù…Ù‚Ø§Ø¹Ø¯ ÙˆÙ…Ø·Ø§Ø¨Ù‚Ø© Ø§Ù„Ø´Ø­Ù† Ø§Ù„Ø¹Ø§Ø¦Ø¯ ÙƒÙ„Ù‡Ø§ Ù…Ø¯ÙÙˆØ¹Ø© Ø¨Ù‡Ø°Ù‡ Ø§Ù„Ø·Ø¨Ù‚Ø©.',
    trustSection: 'Ø·Ø¨Ù‚Ø© Ø§Ù„Ø«Ù‚Ø© ÙˆØ§Ù„Ø³Ù„Ø§Ù…Ø©',
    trustBody:
      'ØªØ³Ø§Ù‡Ù… ÙƒÙ„ Ø±Ø­Ù„Ø© Ù…ÙƒØªÙ…Ù„Ø© ÙÙŠ Ø±Ø³Ù… Ø§Ù„Ø«Ù‚Ø©. Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù„Ù‡ÙˆÙŠØ© ÙˆØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø³Ù„ÙˆÙƒ ÙˆØ±Ø¤ÙŠØ© Ø£ÙˆÙ„ÙŠØ§Ø¡ Ø§Ù„Ø£Ù…ÙˆØ± Ù„Ù…Ø³Ø§Ø±Ø§Øª Ø§Ù„Ù…Ø¯Ø§Ø±Ø³ ÙƒÙ„Ù‡Ø§ Ù…ÙŠØ²Ø§Øª Ù…Ù† Ø§Ù„Ø¯Ø±Ø¬Ø© Ø§Ù„Ø£ÙˆÙ„Ù‰ â€” ÙˆÙ„ÙŠØ³Øª Ø£ÙÙƒØ§Ø±Ø§Ù‹ Ù„Ø§Ø­Ù‚Ø©.',
    networkSection: 'ØªØ¶Ø§Ø¹Ù Ø§Ù„Ø´Ø¨ÙƒØ©',
    networkBody:
      'ÙƒÙ„ Ù…Ø³Ø§Ø± Ø¬Ø¯ÙŠØ¯ ÙŠÙØ¶Ø§Ù Ø¥Ù„Ù‰ Ø±Ø³Ù… ÙˆØ§ØµÙ„ ÙŠØ²ÙŠØ¯ Ù…Ù† Ù‚ÙŠÙ…Ø© ÙƒÙ„ Ù…Ø³Ø§Ø± Ù…ÙˆØ¬ÙˆØ¯. ØªØ¬Ø¯ Ø§Ù„Ø·Ø±ÙˆØ¯ Ù…Ø²ÙŠØ¯Ø§Ù‹ Ù…Ù† Ø§Ù„Ù†Ø§Ù‚Ù„ÙŠÙ†ØŒ ÙˆÙŠØ¬Ø¯ Ø§Ù„Ø±ÙƒØ§Ø¨ Ù…Ø²ÙŠØ¯Ø§Ù‹ Ù…Ù† Ø§Ù„Ù…Ù‚Ø§Ø¹Ø¯ØŒ ÙˆØªØµØ¨Ø­ Ø§Ù„Ù…Ù†Ø¸ÙˆÙ…Ø© Ø£Ø±Ø®Øµ ÙˆØ£Ø³Ø±Ø¹ Ù…Ø¹ Ù†Ù…ÙˆÙ‡Ø§.',
    menaSection: 'ØªØµÙ…ÙŠÙ… ÙŠÙØ¹Ø·ÙŠ Ø§Ù„Ø£ÙˆÙ„ÙˆÙŠØ© Ù„Ù…Ù†Ø·Ù‚Ø© Ø§Ù„Ø´Ø±Ù‚ Ø§Ù„Ø£ÙˆØ³Ø·',
    menaBody:
      'ØªÙ†Ø³ÙŠÙ‚ Ø¹Ø¨Ø± ÙˆØ§ØªØ³Ø§Ø¨ Ø¨Ø´ÙƒÙ„ Ø·Ø¨ÙŠØ¹ÙŠØŒ ÙˆØ§Ø¬Ù‡Ø© ØªÙØ¹Ø·ÙŠ Ø§Ù„Ø£ÙˆÙ„ÙˆÙŠØ© Ù„Ù„Ø¹Ø±Ø¨ÙŠØ©ØŒ ØªØ³Ø¹ÙŠØ± Ø¨Ø§Ù„Ø¯ÙŠÙ†Ø§Ø± Ø§Ù„Ø£Ø±Ø¯Ù†ÙŠØŒ Ø§Ù…ØªØ«Ø§Ù„ Ù„Ù‚Ø§Ù†ÙˆÙ† PDPL Ø§Ù„Ø£Ø±Ø¯Ù†ÙŠØŒ ÙˆØ¨Ù†ÙŠØ© ØªØ­ØªÙŠØ© Ù…Ù‚Ø§ÙˆÙ…Ø© Ù„Ù„Ø§Ù†Ù‚Ø·Ø§Ø¹.',
  },
} as const);

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   Pillar data
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
type Pillar = {
  icon: ReactNode;
  title: { en: string; ar: string };
  body: { en: string; ar: string };
  accent: string;
  tag: { en: string; ar: string };
};

const RAW_PILLARS: Pillar[] = [
  {
    icon: <Brain size={20} />,
    accent: C.cyan,
    title: { en: 'Demand Prediction', ar: 'Ø§Ù„ØªÙ†Ø¨Ø¤ Ø¨Ø§Ù„Ø·Ù„Ø¨' },
    body: {
      en: 'Route demand is modelled from search patterns, booking history, and time-of-day signals so supply can be positioned before riders ask.',
      ar: 'ÙŠØªÙ… Ù†Ù…Ø°Ø¬Ø© Ø·Ù„Ø¨ Ø§Ù„Ù…Ø³Ø§Ø± Ù…Ù† Ø£Ù†Ù…Ø§Ø· Ø§Ù„Ø¨Ø­Ø« ÙˆØ³Ø¬Ù„ Ø§Ù„Ø­Ø¬Ø² ÙˆØ¥Ø´Ø§Ø±Ø§Øª Ø§Ù„ÙˆÙ‚Øª Ù„ØªØ­Ø¯ÙŠØ¯ Ù…ÙˆØ¶Ø¹ Ø§Ù„Ø¹Ø±Ø¶ Ù‚Ø¨Ù„ Ø£Ù† ÙŠØ·Ù„Ø¨ Ø§Ù„Ø±ÙƒØ§Ø¨.',
    },
    tag: { en: 'AI Layer', ar: 'Ø·Ø¨Ù‚Ø© Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ' },
  },
  {
    icon: <TrendingUp size={20} />,
    accent: C.gold,
    title: { en: 'Dynamic Pricing', ar: 'Ø§Ù„ØªØ³Ø¹ÙŠØ± Ø§Ù„Ø¯ÙŠÙ†Ø§Ù…ÙŠÙƒÙŠ' },
    body: {
      en: 'Seat prices and parcel rates adjust in real time based on corridor load, backhaul availability, and competing demand signals.',
      ar: 'ØªØªØ¹Ø¯Ù„ Ø£Ø³Ø¹Ø§Ø± Ø§Ù„Ù…Ù‚Ø§Ø¹Ø¯ ÙˆØ£Ø³Ø¹Ø§Ø± Ø§Ù„Ø·Ø±ÙˆØ¯ ÙÙŠ Ø§Ù„ÙˆÙ‚Øª Ø§Ù„ÙØ¹Ù„ÙŠ Ø¨Ù†Ø§Ø¡Ù‹ Ø¹Ù„Ù‰ Ø­Ù…Ù„ Ø§Ù„Ù…Ù…Ø± ÙˆØªÙˆØ§ÙØ± Ø§Ù„Ø´Ø­Ù† Ø§Ù„Ø¹Ø§Ø¦Ø¯ ÙˆØ¥Ø´Ø§Ø±Ø§Øª Ø§Ù„Ø·Ù„Ø¨.',
    },
    tag: { en: 'Pricing Intelligence', ar: 'Ø°ÙƒØ§Ø¡ Ø§Ù„ØªØ³Ø¹ÙŠØ±' },
  },
  {
    icon: <Route size={20} />,
    accent: C.green,
    title: { en: 'Return-Lane Matching', ar: 'Ù…Ø·Ø§Ø¨Ù‚Ø© Ø§Ù„Ù…Ù…Ø± Ø§Ù„Ø¹Ø§Ø¦Ø¯' },
    body: {
      en: 'Every offered ride is checked for a return-lane signal. Drivers who commit to both directions unlock Raje3 bonuses and higher seat yields.',
      ar: 'ÙŠØªÙ… Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† ÙƒÙ„ Ø±Ø­Ù„Ø© Ù…Ù‚Ø¯Ù…Ø© Ø¨Ø­Ø«Ø§Ù‹ Ø¹Ù† Ø¥Ø´Ø§Ø±Ø© Ø§Ù„Ù…Ø³Ø§Ø± Ø§Ù„Ø¹Ø§Ø¦Ø¯. Ø§Ù„Ø³Ø§Ø¦Ù‚ÙˆÙ† Ø§Ù„Ù…Ù„ØªØ²Ù…ÙˆÙ† Ø¨Ø§Ù„Ø§ØªØ¬Ø§Ù‡ÙŠÙ† ÙŠÙØªØ­ÙˆÙ† Ù…ÙƒØ§ÙØ¢Øª Ø±Ø§Ø¬Ø¹.',
    },
    tag: { en: 'Raje3 Engine', ar: 'Ù…Ø­Ø±Ùƒ Ø±Ø§Ø¬Ø¹' },
  },
  {
    icon: <Package size={20} />,
    accent: C.cyan,
    title: { en: 'Backhaul Intelligence', ar: 'Ø°ÙƒØ§Ø¡ Ø§Ù„Ø´Ø­Ù† Ø§Ù„Ø¹Ø§Ø¦Ø¯' },
    body: {
      en: 'Packages are matched to rides going the same direction. The system prioritises carriers with verified trust scores and available boot space.',
      ar: 'ØªØªØ·Ø§Ø¨Ù‚ Ø§Ù„Ø·Ø±ÙˆØ¯ Ù…Ø¹ Ø§Ù„Ø±Ø­Ù„Ø§Øª Ø§Ù„ØªÙŠ ØªØ³ÙŠØ± ÙÙŠ Ù†ÙØ³ Ø§Ù„Ø§ØªØ¬Ø§Ù‡. ØªÙØ¹Ø·ÙŠ Ø§Ù„Ù…Ù†Ø¸ÙˆÙ…Ø© Ø§Ù„Ø£ÙˆÙ„ÙˆÙŠØ© Ù„Ù„Ù†Ø§Ù‚Ù„ÙŠÙ† Ø§Ù„Ù…ÙˆØ«ÙˆÙ‚ÙŠÙ†.',
    },
    tag: { en: 'Package Network', ar: 'Ø´Ø¨ÙƒØ© Ø§Ù„Ø·Ø±ÙˆØ¯' },
  },
  {
    icon: <ShieldCheck size={20} />,
    accent: C.green,
    title: { en: 'Trust Graph', ar: 'Ø±Ø³Ù… Ø§Ù„Ø«Ù‚Ø©' },
    body: {
      en: 'Each completed trip, verified identity, and resolved dispute updates the trust graph. High-trust profiles unlock better pricing and priority matching.',
      ar: 'ÙƒÙ„ Ø±Ø­Ù„Ø© Ù…ÙƒØªÙ…Ù„Ø© ÙˆÙ‡ÙˆÙŠØ© Ù…ÙˆØ«Ù‚Ø© ÙŠØ­Ø¯Ù‘Ø« Ø±Ø³Ù… Ø§Ù„Ø«Ù‚Ø©. Ø§Ù„Ù…Ù„ÙØ§Øª Ø¹Ø§Ù„ÙŠØ© Ø§Ù„Ø«Ù‚Ø© ØªÙØªØ­ ØªØ³Ø¹ÙŠØ±Ø§Ù‹ Ø£ÙØ¶Ù„.',
    },
    tag: { en: 'Safety Layer', ar: 'Ø·Ø¨Ù‚Ø© Ø§Ù„Ø£Ù…Ø§Ù†' },
  },
  {
    icon: <Globe2 size={20} />,
    accent: C.gold,
    title: { en: 'MENA Localisation', ar: 'Ø§Ù„ØªØ®ØµÙŠØµ Ù„Ù„Ù…Ù†Ø·Ù‚Ø©' },
    body: {
      en: 'WhatsApp-native messaging, RTL-first UI, Arabic voice prompts, JOD pricing, Jordan PDPL compliance, and offline-queue architecture.',
      ar: 'Ù…Ø±Ø§Ø³Ù„Ø© Ø¹Ø¨Ø± ÙˆØ§ØªØ³Ø§Ø¨ Ø·Ø¨ÙŠØ¹ÙŠØ©ØŒ ÙˆØ§Ø¬Ù‡Ø© RTL Ø£ÙˆÙ„Ø§Ù‹ØŒ Ù…ÙˆØ¬Ù‡Ø§Øª ØµÙˆØªÙŠØ© Ø¹Ø±Ø¨ÙŠØ©ØŒ ØªØ³Ø¹ÙŠØ± Ø¨Ø§Ù„Ø¯ÙŠÙ†Ø§Ø± ÙˆØ§Ù…ØªØ«Ø§Ù„ PDPL.',
    },
    tag: { en: 'Regional First', ar: 'Ø§Ù„Ù…Ù†Ø·Ù‚Ø© Ø£ÙˆÙ„Ø§Ù‹' },
  },
  {
    icon: <Layers size={20} />,
    accent: C.cyan,
    title: { en: 'Mobility OS', ar: 'Ù†Ø¸Ø§Ù… ØªØ´ØºÙŠÙ„ Ø§Ù„ØªÙ†Ù‚Ù„' },
    body: {
      en: 'A network control layer exposing corridor ownership, route density, and demand compounding so operators can act on signals rather than hunches.',
      ar: 'Ø·Ø¨Ù‚Ø© ØªØ­ÙƒÙ… ÙÙŠ Ø§Ù„Ø´Ø¨ÙƒØ© ØªÙƒØ´Ù Ø¹Ù† Ù…Ù„ÙƒÙŠØ© Ø§Ù„Ù…Ù…Ø± ÙˆÙƒØ«Ø§ÙØ© Ø§Ù„Ù…Ø³Ø§Ø± ÙˆØªØ¶Ø§Ø¹Ù Ø§Ù„Ø·Ù„Ø¨.',
    },
    tag: { en: 'Control Layer', ar: 'Ø·Ø¨Ù‚Ø© Ø§Ù„ØªØ­ÙƒÙ…' },
  },
  {
    icon: <Users size={20} />,
    accent: C.green,
    title: { en: 'School & Corporate', ar: 'Ø§Ù„Ù…Ø¯Ø§Ø±Ø³ ÙˆØ§Ù„Ø´Ø±ÙƒØ§Øª' },
    body: {
      en: 'Recurring seat allocation, guardian visibility, managed billing, and service-provider dispatch on the same route graph as the marketplace.',
      ar: 'ØªØ®ØµÙŠØµ Ù…Ù‚Ø§Ø¹Ø¯ Ù…ØªÙƒØ±Ø±ØŒ Ø±Ø¤ÙŠØ© Ø£ÙˆÙ„ÙŠØ§Ø¡ Ø§Ù„Ø£Ù…ÙˆØ±ØŒ ÙÙˆØªØ±Ø© Ù…ÙØ¯Ø§Ø±Ø©ØŒ ÙˆØ¥Ø±Ø³Ø§Ù„ Ù…Ø²ÙˆØ¯ Ø§Ù„Ø®Ø¯Ù…Ø©.',
    },
    tag: { en: 'Enterprise', ar: 'Ø§Ù„Ù…Ø¤Ø³Ø³Ø§Øª' },
  },
  {
    icon: <CircuitBoard size={20} />,
    accent: C.gold,
    title: { en: 'Corridor Compounding', ar: 'ØªØ¶Ø§Ø¹Ù Ø§Ù„Ù…Ù…Ø±' },
    body: {
      en: 'Every seat, package, and bus stop on a corridor increases the value of every other asset on it â€” creating a defensible flywheel effect over time.',
      ar: 'ÙƒÙ„ Ù…Ù‚Ø¹Ø¯ ÙˆØ·Ø±Ø¯ ÙˆÙ…Ø­Ø·Ø© Ø­Ø§ÙÙ„Ø© Ø¹Ù„Ù‰ Ù…Ù…Ø± ÙŠØ²ÙŠØ¯ Ù…Ù† Ù‚ÙŠÙ…Ø© ÙƒÙ„ Ø£ØµÙ„ Ø¢Ø®Ø± Ø¹Ù„ÙŠÙ‡ â€” Ù…Ù…Ø§ ÙŠØ®Ù„Ù‚ ØªØ£Ø«ÙŠØ± Ø§Ù„Ø¯ÙˆÙ„Ø§Ø¨ Ø§Ù„Ø¯ÙØ§Ø¹ÙŠ.',
    },
    tag: { en: 'Network Effect', ar: 'Ø£Ø«Ø± Ø§Ù„Ø´Ø¨ÙƒØ©' },
  },
];
const PILLARS: Pillar[] = RAW_PILLARS.map(({ icon, ...pillar }) => ({
  icon,
  ...normalizeTextTree(pillar),
}));

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   Metrics
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
type Metric = {
  label: { en: string; ar: string };
  value: string;
  sub: { en: string; ar: string };
  accent: string;
  icon: ReactNode;
};

const RAW_METRICS: Metric[] = [
  {
    icon: <BarChart3 size={16} />,
    accent: C.cyan,
    value: '18',
    label: { en: 'Active corridors', ar: 'Ù…Ù…Ø±Ø§Øª Ù†Ø´Ø·Ø©' },
    sub: {
      en: 'Modelled Jordan-first lanes',
      ar: 'Ù…Ù…Ø±Ø§Øª Ø£Ø±Ø¯Ù†ÙŠØ© Ø£ÙˆÙ„Ù‰ Ù…ÙÙ†Ù…Ø°Ø¬Ø©',
    },
  },
  {
    icon: <Zap size={16} />,
    accent: C.gold,
    value: '<3 min',
    label: { en: 'Avg match time', ar: 'Ù…ØªÙˆØ³Ø· ÙˆÙ‚Øª Ø§Ù„Ù…Ø·Ø§Ø¨Ù‚Ø©' },
    sub: {
      en: 'Demand-to-supply signal latency',
      ar: 'Ø²Ù…Ù† Ø§Ø³ØªØ¬Ø§Ø¨Ø© Ø¥Ø´Ø§Ø±Ø© Ø§Ù„Ø·Ù„Ø¨ Ø¥Ù„Ù‰ Ø§Ù„Ø¹Ø±Ø¶',
    },
  },
  {
    icon: <Activity size={16} />,
    accent: C.green,
    value: '94%',
    label: { en: 'Backhaul attach rate', ar: 'Ù…Ø¹Ø¯Ù„ Ø¥Ø±ÙØ§Ù‚ Ø§Ù„Ø´Ø­Ù† Ø§Ù„Ø¹Ø§Ø¦Ø¯' },
    sub: { en: 'Packages matched to live rides', ar: 'Ø·Ø±ÙˆØ¯ Ù…Ø·Ø§Ø¨Ù‚Ø© Ù„Ø±Ø­Ù„Ø§Øª Ø­ÙŠØ©' },
  },
  {
    icon: <Sparkles size={16} />,
    accent: C.cyan,
    value: '3.5Ã—',
    label: { en: 'WhatsApp conversion lift', ar: 'Ø±ÙØ¹ ØªØ­ÙˆÙŠÙ„ ÙˆØ§ØªØ³Ø§Ø¨' },
    sub: { en: 'vs standard in-app CTA', ar: 'Ù…Ù‚Ø§Ø±Ù†Ø©Ù‹ Ø¨Ø§Ù„Ø¯Ø¹ÙˆØ© Ø§Ù„Ù‚ÙŠØ§Ø³ÙŠØ©' },
  },
  {
    icon: <TrendingUp size={16} />,
    accent: C.gold,
    value: '28%',
    label: { en: 'Avg corridor savings', ar: 'Ù…ØªÙˆØ³Ø· ØªÙˆÙÙŠØ± Ø§Ù„Ù…Ù…Ø±' },
    sub: {
      en: 'vs solo on-demand alternatives',
      ar: 'Ù…Ù‚Ø§Ø±Ù†Ø©Ù‹ Ø¨Ø¨Ø¯Ø§Ø¦Ù„ Ø§Ù„Ø·Ù„Ø¨ Ø§Ù„ÙØ±Ø¯ÙŠ',
    },
  },
  {
    icon: <ShieldCheck size={16} />,
    accent: C.green,
    value: '99.4%',
    label: { en: 'Trust graph accuracy', ar: 'Ø¯Ù‚Ø© Ø±Ø³Ù… Ø§Ù„Ø«Ù‚Ø©' },
    sub: {
      en: 'Verified identity resolution rate',
      ar: 'Ù…Ø¹Ø¯Ù„ Ø¯Ù‚Ø© Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù„Ù‡ÙˆÙŠØ©',
    },
  },
];
const METRICS: Metric[] = RAW_METRICS.map(({ icon, ...metric }) => ({
  icon,
  ...normalizeTextTree(metric),
}));

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   Roadmap
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
type RoadmapItem = {
  phase: { en: string; ar: string };
  title: { en: string; ar: string };
  items: { en: string; ar: string }[];
  status: 'live' | 'in-progress' | 'next';
  accent: string;
};

const ROADMAP: RoadmapItem[] = normalizeTextTree([
  {
    status: 'live',
    accent: C.green,
    phase: { en: 'Phase 1 â€” Live', ar: 'Ø§Ù„Ù…Ø±Ø­Ù„Ø© 1 â€” Ø­ÙŠ' },
    title: { en: 'Foundation layer', ar: 'Ø·Ø¨Ù‚Ø© Ø§Ù„ØªØ£Ø³ÙŠØ³' },
    items: [
      {
        en: 'Ride marketplace with seat-level pricing',
        ar: 'Ø³ÙˆÙ‚ Ø§Ù„Ø±Ø­Ù„Ø§Øª Ù…Ø¹ ØªØ³Ø¹ÙŠØ± Ø¹Ù„Ù‰ Ù…Ø³ØªÙˆÙ‰ Ø§Ù„Ù…Ù‚Ø¹Ø¯',
      },
      {
        en: 'Package handoff via ride network',
        ar: 'ØªØ³Ù„ÙŠÙ… Ø§Ù„Ø·Ø±ÙˆØ¯ Ø¹Ø¨Ø± Ø´Ø¨ÙƒØ© Ø§Ù„Ø±Ø­Ù„Ø§Øª',
      },
      { en: 'Bus corridor scheduling', ar: 'Ø¬Ø¯ÙˆÙ„Ø© Ù…Ù…Ø± Ø§Ù„Ø­Ø§ÙÙ„Ø§Øª' },
      {
        en: 'Wallet and JOD payments',
        ar: 'Ø§Ù„Ù…Ø­ÙØ¸Ø© ÙˆØ§Ù„Ù…Ø¯ÙÙˆØ¹Ø§Øª Ø¨Ø§Ù„Ø¯ÙŠÙ†Ø§Ø± Ø§Ù„Ø£Ø±Ø¯Ù†ÙŠ',
      },
      { en: 'Trust + identity verification', ar: 'Ø§Ù„Ø«Ù‚Ø© + Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù„Ù‡ÙˆÙŠØ©' },
      {
        en: 'Bilingual AR/EN, GDPR + Jordan PDPL',
        ar: 'Ø«Ù†Ø§Ø¦ÙŠ Ø§Ù„Ù„ØºØ©ØŒ GDPR + Ù‚Ø§Ù†ÙˆÙ† PDPL',
      },
    ],
  },
  {
    status: 'in-progress',
    accent: C.gold,
    phase: { en: 'Phase 2 â€” In Progress', ar: 'Ø§Ù„Ù…Ø±Ø­Ù„Ø© 2 â€” Ø¬Ø§Ø±Ù Ø§Ù„ØªÙ†ÙÙŠØ°' },
    title: { en: 'Intelligence layer', ar: 'Ø·Ø¨Ù‚Ø© Ø§Ù„Ø°ÙƒØ§Ø¡' },
    items: [
      {
        en: 'Real-time demand prediction engine',
        ar: 'Ù…Ø­Ø±Ùƒ Ø§Ù„ØªÙ†Ø¨Ø¤ Ø¨Ø§Ù„Ø·Ù„Ø¨ ÙÙŠ Ø§Ù„ÙˆÙ‚Øª Ø§Ù„ÙØ¹Ù„ÙŠ',
      },
      { en: 'Raje3 return-lane matching', ar: 'Ù…Ø·Ø§Ø¨Ù‚Ø© Ø§Ù„Ù…Ø³Ø§Ø± Ø§Ù„Ø¹Ø§Ø¦Ø¯ Ø±Ø§Ø¬Ø¹' },
      { en: 'Dynamic corridor pricing', ar: 'ØªØ³Ø¹ÙŠØ± Ù…Ù…Ø± Ø¯ÙŠÙ†Ø§Ù…ÙŠÙƒÙŠ' },
      {
        en: 'WhatsApp-native booking confirmation',
        ar: 'ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ø­Ø¬Ø² Ø§Ù„Ø£ØµÙ„ÙŠ Ø¹Ø¨Ø± ÙˆØ§ØªØ³Ø§Ø¨',
      },
      {
        en: 'Corporate managed-mobility accounts',
        ar: 'Ø­Ø³Ø§Ø¨Ø§Øª Ø§Ù„ØªÙ†Ù‚Ù„ Ø§Ù„Ù…ÙØ¯Ø§Ø± Ù„Ù„Ø´Ø±ÙƒØ§Øª',
      },
      {
        en: 'School transport + guardian visibility',
        ar: 'Ù†Ù‚Ù„ Ù…Ø¯Ø±Ø³ÙŠ + Ø±Ø¤ÙŠØ© Ø£ÙˆÙ„ÙŠØ§Ø¡ Ø§Ù„Ø£Ù…ÙˆØ±',
      },
    ],
  },
  {
    status: 'next',
    accent: C.cyan,
    phase: { en: 'Phase 3 â€” Next', ar: 'Ø§Ù„Ù…Ø±Ø­Ù„Ø© 3 â€” Ø§Ù„Ù‚Ø§Ø¯Ù…' },
    title: { en: 'Network compounding layer', ar: 'Ø·Ø¨Ù‚Ø© ØªØ¶Ø§Ø¹Ù Ø§Ù„Ø´Ø¨ÙƒØ©' },
    items: [
      {
        en: 'Cross-border MENA corridors (Aqaba â†’ Eilat, Amman â†’ Damascus)',
        ar: 'Ù…Ù…Ø±Ø§Øª Ø¹Ø§Ø¨Ø±Ø© Ù„Ù„Ø­Ø¯ÙˆØ¯ ÙÙŠ Ø§Ù„Ù…Ù†Ø·Ù‚Ø©',
      },
      {
        en: 'AI-driven credit-adjusted movement pricing',
        ar: 'ØªØ³Ø¹ÙŠØ± Ø§Ù„Ø­Ø±ÙƒØ© Ø§Ù„Ù…Ø¹Ø¯Ù‘Ù„ Ø¨Ø§Ù„Ø§Ø¦ØªÙ…Ø§Ù†',
      },
      {
        en: 'Autonomous dispatch for corporate fleets',
        ar: 'Ø§Ù„Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„ØªÙ„Ù‚Ø§Ø¦ÙŠ Ù„Ø£Ø³Ø§Ø·ÙŠÙ„ Ø§Ù„Ø´Ø±ÙƒØ§Øª',
      },
      {
        en: 'Open API for third-party corridor integration',
        ar: 'ÙˆØ§Ø¬Ù‡Ø© Ù…ÙØªÙˆØ­Ø© Ù„ØªÙƒØ§Ù…Ù„ Ø§Ù„Ù…Ù…Ø±',
      },
      {
        en: 'Carbon accounting per corridor per trip',
        ar: 'Ù…Ø­Ø§Ø³Ø¨Ø© Ø§Ù„ÙƒØ±Ø¨ÙˆÙ† Ù„ÙƒÙ„ Ù…Ù…Ø± Ù„ÙƒÙ„ Ø±Ø­Ù„Ø©',
      },
    ],
  },
]) as RoadmapItem[];

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   Style helpers
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function panel(extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    position: 'relative',
    background: CARD_BG,
    border: BORD,
    borderRadius: 24,
    boxShadow: SH.md,
    overflow: 'hidden',
    ...extra,
  };
}

function glassChip(accent: string): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 10px',
    borderRadius: 999,
    border: `1px solid ${accent}33`,
    background: `${accent}14`,
    color: accent,
    fontSize: '0.7rem',
    fontWeight: 800,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
  };
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   Page
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export default function InnovationHubPage() {
  const { language, dir } = useLanguage();
  const ar = language === 'ar';
  const copy = useMemo(() => (ar ? COPY.ar : COPY.en), [ar]);

  return (
    <div
      dir={dir}
      style={{
        minHeight: '100vh',
        background: `${GRAD_AURORA}, radial-gradient(circle at 80% 12%, rgba(168,214,20,0.12), transparent 22%), ${C.bg}`,
        color: C.text,
        fontFamily: F,
        padding: '28px 16px 88px',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gap: 20 }}>
        {/* Hero */}
        <section
          style={panel({
            padding: '32px 28px',
            borderRadius: 32,
            background: `linear-gradient(135deg, ${C.cyanDim}, rgba(255,255,255,0.025))`,
            border: `1px solid ${C.cyanGlow}`,
          })}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background:
                'radial-gradient(circle at 82% 20%, rgba(168,214,20,0.14), transparent 30%)',
            }}
          />
          <div style={{ position: 'relative', display: 'grid', gap: 14, maxWidth: 880 }}>
            <div
              style={{
                fontSize: '0.72rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: C.cyan,
                fontWeight: 800,
              }}
            >
              {copy.eyebrow}
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: 'clamp(2rem, 4.5vw, 3.75rem)',
                lineHeight: 1.0,
                letterSpacing: '-0.04em',
                fontWeight: 900,
              }}
            >
              {copy.title}
            </h1>
            <p
              style={{
                margin: 0,
                color: C.textSub,
                lineHeight: 1.78,
                fontSize: '1.02rem',
                maxWidth: 760,
              }}
            >
              {copy.subtitle}
            </p>
          </div>
        </section>

        {/* Metrics bar */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
          }}
        >
          {METRICS.map(m => (
            <div
              key={m.value + (ar ? m.label.ar : m.label.en)}
              style={panel({
                padding: '16px 18px',
                borderRadius: 22,
                border: `1px solid ${m.accent}26`,
                boxShadow: `0 10px 28px ${m.accent}12`,
              })}
            >
              <div style={glassChip(m.accent)}>
                {m.icon}
                {ar ? m.label.ar : m.label.en}
              </div>
              <div
                style={{
                  fontSize: '1.95rem',
                  fontWeight: 900,
                  color: m.accent,
                  lineHeight: 1,
                  margin: '10px 0 6px',
                  textShadow: `0 0 18px ${m.accent}30`,
                }}
              >
                {m.value}
              </div>
              <div style={{ color: C.textMuted, fontSize: '0.78rem', lineHeight: 1.55 }}>
                {ar ? m.sub.ar : m.sub.en}
              </div>
            </div>
          ))}
        </section>

        {/* Pillars grid */}
        <section>
          <div
            style={{
              fontSize: '0.72rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: C.textMuted,
              marginBottom: 14,
              fontWeight: 800,
            }}
          >
            {copy.pillars}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
              gap: 14,
            }}
          >
            {PILLARS.map(pillar => (
              <article
                key={ar ? pillar.title.ar : pillar.title.en}
                style={panel({
                  padding: '20px 20px 18px',
                  borderRadius: 22,
                  border: `1px solid ${pillar.accent}22`,
                })}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      background: `${pillar.accent}14`,
                      border: `1px solid ${pillar.accent}28`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: pillar.accent,
                      flexShrink: 0,
                    }}
                  >
                    {pillar.icon}
                  </div>
                  <div style={glassChip(pillar.accent)}>{ar ? pillar.tag.ar : pillar.tag.en}</div>
                </div>
                <h3
                  style={{
                    margin: '0 0 8px',
                    fontSize: '1rem',
                    fontWeight: 900,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {ar ? pillar.title.ar : pillar.title.en}
                </h3>
                <p style={{ margin: 0, color: C.textSub, fontSize: '0.86rem', lineHeight: 1.7 }}>
                  {ar ? pillar.body.ar : pillar.body.en}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Deep-dive sections */}
        {(
          [
            { title: copy.aiSection, body: copy.aiBody, accent: C.cyan, icon: <Brain size={18} /> },
            {
              title: copy.trustSection,
              body: copy.trustBody,
              accent: C.green,
              icon: <ShieldCheck size={18} />,
            },
            {
              title: copy.networkSection,
              body: copy.networkBody,
              accent: C.gold,
              icon: <Activity size={18} />,
            },
            {
              title: copy.menaSection,
              body: copy.menaBody,
              accent: C.cyan,
              icon: <Globe2 size={18} />,
            },
          ] as { title: string; body: string; accent: string; icon: ReactNode }[]
        ).map(s => (
          <section
            key={s.title}
            style={panel({
              padding: '22px 22px 20px',
              borderRadius: 24,
              border: `1px solid ${s.accent}22`,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 18,
            })}
          >
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 15,
                background: `${s.accent}14`,
                border: `1px solid ${s.accent}28`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: s.accent,
                flexShrink: 0,
              }}
            >
              {s.icon}
            </div>
            <div>
              <h2
                style={{
                  margin: '0 0 8px',
                  fontSize: '1.1rem',
                  fontWeight: 900,
                  letterSpacing: '-0.02em',
                }}
              >
                {s.title}
              </h2>
              <p
                style={{
                  margin: 0,
                  color: C.textSub,
                  lineHeight: 1.75,
                  fontSize: '0.92rem',
                  maxWidth: 820,
                }}
              >
                {s.body}
              </p>
            </div>
          </section>
        ))}

        {/* Roadmap */}
        <section>
          <div
            style={{
              fontSize: '0.72rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: C.textMuted,
              marginBottom: 14,
              fontWeight: 800,
            }}
          >
            {copy.roadmap}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
              gap: 14,
            }}
          >
            {ROADMAP.map(phase => (
              <article
                key={ar ? phase.phase.ar : phase.phase.en}
                style={panel({
                  padding: '20px 20px 18px',
                  borderRadius: 24,
                  border: `1px solid ${phase.accent}28`,
                  boxShadow:
                    phase.status === 'live'
                      ? `0 14px 36px ${phase.accent}14`
                      : '0 8px 22px rgba(0,0,0,0.18)',
                })}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.68rem',
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: phase.accent,
                      fontWeight: 800,
                    }}
                  >
                    {ar ? phase.phase.ar : phase.phase.en}
                  </div>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      background: phase.accent,
                      boxShadow: `0 0 12px ${phase.accent}`,
                      opacity: phase.status === 'next' ? 0.45 : 1,
                    }}
                  />
                </div>
                <h3 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 900 }}>
                  {ar ? phase.title.ar : phase.title.en}
                </h3>
                <ul
                  style={{
                    margin: 0,
                    padding: ar ? '0 18px 0 0' : '0 0 0 18px',
                    display: 'grid',
                    gap: 8,
                  }}
                >
                  {phase.items.map(item => (
                    <li
                      key={ar ? item.ar : item.en}
                      style={{ color: C.textSub, fontSize: '0.84rem', lineHeight: 1.6 }}
                    >
                      {ar ? item.ar : item.en}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

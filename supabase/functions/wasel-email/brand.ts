/**
 * Wasel Email Brand System
 * Single source of truth for all email visual identity.
 * Mirrors tokens from src/tokens/wasel-tokens.ts — kept as plain strings
 * so the Deno edge runtime has zero build dependencies.
 */

export const BRAND = {
  // ── Core palette ──────────────────────────────────────────────────────────
  bg:          '#061726',
  bgCard:      '#0B2135',
  bgDeep:      '#040C18',
  cyan:        '#16C7F2',
  cyanLight:   '#63E2F4',
  gold:        '#C7FF1A',
  green:       '#60C536',
  greenDark:   '#49A82F',
  red:         '#FF646A',
  amber:       '#FFD84A',
  textPrimary: '#EAF7FF',
  textSub:     'rgba(234,247,255,0.78)',
  textMuted:   'rgba(153,184,210,0.66)',
  border:      'rgba(73,190,242,0.18)',
  borderStrong:'rgba(73,190,242,0.32)',

  // ── App metadata ──────────────────────────────────────────────────────────
  appName:     'Wasel',
  tagline:     'Mobility OS',
  appUrl:      Deno.env.get('VITE_APP_URL') ?? 'https://wasel14.online',
  supportEmail:Deno.env.get('RESEND_REPLY_TO_EMAIL') ?? 'support@wasel.jo',
  fromEmail:   Deno.env.get('RESEND_FROM_EMAIL')     ?? 'Wasel <notifications@wasel14.online>',

  // ── Font stack (web-safe fallback for email clients) ─────────────────────
  font: "'Plus Jakarta Sans', 'Cairo', 'Segoe UI', Arial, sans-serif",
} as const;

/**
 * Inline SVG of the Wasel mark on the same bright tile used in the app.
 * Sized for email clients that block remote images.
 */
export const LOGO_SVG_48 = `
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 112 112" role="img" aria-label="Wasel">
  <defs>
    <linearGradient id="waselBg48" x1="12" y1="12" x2="100" y2="100" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#FFFFFF" />
      <stop offset="1" stop-color="#EFF6F2" />
    </linearGradient>
    <linearGradient id="waselTop48" x1="20" y1="40" x2="68" y2="40" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#00C9F5" />
      <stop offset="1" stop-color="#00AEE4" />
    </linearGradient>
    <linearGradient id="waselRight48" x1="66" y1="66" x2="96" y2="66" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#0BCFAE" />
      <stop offset="1" stop-color="#8FDD00" />
    </linearGradient>
    <linearGradient id="waselBottom48" x1="20" y1="88" x2="68" y2="88" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#10D0B1" />
      <stop offset="0.55" stop-color="#42D86A" />
      <stop offset="1" stop-color="#98E100" />
    </linearGradient>
    <linearGradient id="waselLink48" x1="70" y1="44" x2="70" y2="90" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#00C4F3" />
      <stop offset="0.45" stop-color="#12D6BB" />
      <stop offset="1" stop-color="#99E100" />
    </linearGradient>
  </defs>
  <rect x="6" y="6" width="100" height="100" rx="18" fill="url(#waselBg48)" />
  <rect x="20" y="24" width="48" height="32" rx="8" stroke="url(#waselTop48)" stroke-width="5"/>
  <rect x="66" y="50" width="30" height="20" rx="6" stroke="url(#waselRight48)" stroke-width="5"/>
  <rect x="20" y="76" width="48" height="32" rx="8" stroke="url(#waselBottom48)" stroke-width="5"/>
  <path d="M70 40V92" stroke="url(#waselLink48)" stroke-width="5" stroke-linecap="round" />
</svg>`.trim();

/**
 * Larger 64 × 64 variant for hero areas at top of email.
 */
export const LOGO_SVG_64 = `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 112 112" role="img" aria-label="Wasel">
  <defs>
    <linearGradient id="waselBg64" x1="12" y1="12" x2="100" y2="100" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#FFFFFF" />
      <stop offset="1" stop-color="#EFF6F2" />
    </linearGradient>
    <linearGradient id="waselTop64" x1="20" y1="40" x2="68" y2="40" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#00C9F5" />
      <stop offset="1" stop-color="#00AEE4" />
    </linearGradient>
    <linearGradient id="waselRight64" x1="66" y1="66" x2="96" y2="66" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#0BCFAE" />
      <stop offset="1" stop-color="#8FDD00" />
    </linearGradient>
    <linearGradient id="waselBottom64" x1="20" y1="88" x2="68" y2="88" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#10D0B1" />
      <stop offset="0.55" stop-color="#42D86A" />
      <stop offset="1" stop-color="#98E100" />
    </linearGradient>
    <linearGradient id="waselLink64" x1="70" y1="44" x2="70" y2="90" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#00C4F3" />
      <stop offset="0.45" stop-color="#12D6BB" />
      <stop offset="1" stop-color="#99E100" />
    </linearGradient>
  </defs>
  <rect x="6" y="6" width="100" height="100" rx="18" fill="url(#waselBg64)" />
  <rect x="20" y="24" width="48" height="32" rx="8" stroke="url(#waselTop64)" stroke-width="5"/>
  <rect x="66" y="50" width="30" height="20" rx="6" stroke="url(#waselRight64)" stroke-width="5"/>
  <rect x="20" y="76" width="48" height="32" rx="8" stroke="url(#waselBottom64)" stroke-width="5"/>
  <path d="M70 40V92" stroke="url(#waselLink64)" stroke-width="5" stroke-linecap="round" />
</svg>`.trim();

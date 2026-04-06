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
  tagline:     'Linked Mobility Network',
  appUrl:      Deno.env.get('VITE_APP_URL') ?? 'https://wasel14.online',
  supportEmail:Deno.env.get('RESEND_REPLY_TO_EMAIL') ?? 'support@wasel.jo',
  fromEmail:   Deno.env.get('RESEND_FROM_EMAIL')     ?? 'Wasel <notifications@wasel14.online>',

  // ── Font stack (web-safe fallback for email clients) ─────────────────────
  font: "'Plus Jakarta Sans', 'Cairo', 'Segoe UI', Arial, sans-serif",
} as const;

/**
 * Inline SVG of the Wasel logomark — 3 rounded rectangles + connector bar.
 * Sized at 48 × 48 px so it renders cleanly in email clients that block remote images.
 * Gradients are replaced with flat fills for maximum email-client compatibility.
 */
export const LOGO_SVG_48 = `
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 112 112" role="img" aria-label="Wasel">
  <!-- Upper cyan rectangle -->
  <rect x="16" y="12" width="58" height="34" rx="12" fill="#12D6F4" stroke="#0C6EA8" stroke-width="6"/>
  <!-- Right lime rectangle -->
  <rect x="62" y="44" width="34" height="22" rx="8" fill="#7CE642" stroke="#49A82F" stroke-width="6"/>
  <!-- Lower teal-lime rectangle -->
  <rect x="16" y="66" width="58" height="34" rx="12" fill="#2FD3B8" stroke="#49A82F" stroke-width="6"/>
  <!-- Connector bar -->
  <rect x="59" y="27" width="10" height="56" rx="5" fill="#11C5F0"/>
</svg>`.trim();

/**
 * Larger 64 × 64 variant for hero areas at top of email.
 */
export const LOGO_SVG_64 = `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 112 112" role="img" aria-label="Wasel">
  <rect x="16" y="12" width="58" height="34" rx="12" fill="#12D6F4" stroke="#0C6EA8" stroke-width="6"/>
  <rect x="62" y="44" width="34" height="22" rx="8" fill="#7CE642" stroke="#49A82F" stroke-width="6"/>
  <rect x="16" y="66" width="58" height="34" rx="12" fill="#2FD3B8" stroke="#49A82F" stroke-width="6"/>
  <rect x="59" y="27" width="10" height="56" rx="5" fill="#11C5F0"/>
</svg>`.trim();

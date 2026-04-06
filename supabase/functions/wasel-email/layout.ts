/**
 * Wasel Email Layout System
 * Shared HTML shell + component primitives used by every email template.
 * All styles are inlined — required for Gmail, Outlook, Apple Mail compatibility.
 */

import { BRAND, LOGO_SVG_48, LOGO_SVG_64 } from './brand.ts';

// ── Utility ──────────────────────────────────────────────────────────────────

export function esc(value: string): string {
  return value
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}

export function fmt(jod: number): string {
  return `JOD ${jod.toFixed(3)}`;
}

export function fmtDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-JO', {
      day: 'numeric', month: 'long', year: 'numeric',
      timeZone: 'Asia/Amman',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ── Base shell ────────────────────────────────────────────────────────────────

export function emailShell(opts: {
  subject:     string;
  preheader:   string;
  bodyHtml:    string;
  dir?:        'ltr' | 'rtl';
}): string {
  const dir = opts.dir ?? 'ltr';
  return `<!DOCTYPE html>
<html lang="${dir === 'rtl' ? 'ar' : 'en'}" dir="${dir}" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${esc(opts.subject)}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
    img { -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; }
    body { margin:0; padding:0; background-color:${BRAND.bgDeep}; }
    a { color:${BRAND.cyan}; text-decoration:none; }
    a:hover { text-decoration:underline; }
    @media only screen and (max-width:600px) {
      .email-wrapper  { width:100% !important; }
      .email-body     { padding:24px 16px !important; }
      .detail-row td  { display:block !important; width:100% !important; padding-bottom:8px !important; }
      .cta-btn        { display:block !important; width:100% !important; text-align:center !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bgDeep};">

  <!-- Preheader (invisible preview text) -->
  <span style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    ${esc(opts.preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </span>

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:${BRAND.bgDeep};padding:32px 16px;">
    <tr>
      <td align="center">

        <!-- Email card -->
        <table class="email-wrapper" width="600" cellpadding="0" cellspacing="0" border="0"
               style="background-color:${BRAND.bgCard};border-radius:24px;
                      border:1px solid ${BRAND.border};
                      box-shadow:0 24px 64px rgba(0,0,0,0.48);">
          <tr>
            <td class="email-body" style="padding:40px 40px 32px;">

              ${emailHeader()}
              ${opts.bodyHtml}
              ${emailFooter()}

            </td>
          </tr>
        </table>

        <!-- Below-card legal line -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;">
          <tr>
            <td align="center"
                style="font-family:${BRAND.font};font-size:11px;color:rgba(153,184,210,0.36);
                       line-height:1.8;padding:0 20px;">
              &copy; ${new Date().getUTCFullYear()} Wasel Linked Mobility &mdash; Amman, Jordan &middot;
              <a href="${BRAND.appUrl}/app/privacy" style="color:rgba(153,184,210,0.42);">Privacy</a> &middot;
              <a href="${BRAND.appUrl}/app/terms"   style="color:rgba(153,184,210,0.42);">Terms</a>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Shared header ─────────────────────────────────────────────────────────────

function emailHeader(): string {
  return `
  <!-- ── Wasel Header ── -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="border-bottom:1px solid ${BRAND.border};padding-bottom:28px;margin-bottom:32px;">
    <tr>
      <td valign="middle">
        <!-- Logo mark + wordmark side by side -->
        <table cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td valign="middle" style="padding-right:14px;">
              ${LOGO_SVG_64}
            </td>
            <td valign="middle">
              <div style="font-family:${BRAND.font};font-size:22px;font-weight:900;
                          letter-spacing:0.18em;text-transform:uppercase;
                          color:${BRAND.textPrimary};line-height:1;">
                Wasel
              </div>
              <div style="font-family:${BRAND.font};font-size:10px;font-weight:600;
                          letter-spacing:0.12em;text-transform:uppercase;
                          color:${BRAND.textMuted};margin-top:3px;">
                Mobility OS
              </div>
            </td>
          </tr>
        </table>
      </td>
      <td align="right" valign="middle">
        <div style="display:inline-block;padding:6px 12px;border-radius:999px;
                    background:rgba(22,199,242,0.10);border:1px solid ${BRAND.borderStrong};
                    font-family:${BRAND.font};font-size:10px;font-weight:800;
                    letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.cyan};">
          <span style="display:inline-block;width:7px;height:7px;border-radius:50%;
                        background:${BRAND.green};margin-right:6px;vertical-align:middle;"></span>
          Jordan Network
        </div>
      </td>
    </tr>
  </table>`;
}

// ── Shared footer ─────────────────────────────────────────────────────────────

function emailFooter(): string {
  return `
  <!-- ── Footer ── -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="border-top:1px solid ${BRAND.border};margin-top:40px;padding-top:28px;">
    <tr>
      <td>
        <!-- Mini logo row -->
        <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
          <tr>
            <td valign="middle" style="padding-right:10px;">
              ${LOGO_SVG_48}
            </td>
            <td valign="middle"
                style="font-family:${BRAND.font};font-size:13px;font-weight:800;
                       letter-spacing:0.1em;text-transform:uppercase;color:${BRAND.textSub};">
              Wasel
              <div style="font-size:9px;font-weight:600;letter-spacing:0.12em;color:${BRAND.textMuted};margin-top:2px;">
                Mobility OS
              </div>
            </td>
          </tr>
        </table>

        <p style="font-family:${BRAND.font};font-size:12px;color:${BRAND.textMuted};
                  line-height:1.8;margin:0 0 10px;">
          Questions? Reply to this email or reach us at
          <a href="mailto:${BRAND.supportEmail}" style="color:${BRAND.cyan};">${BRAND.supportEmail}</a>.
        </p>
        <p style="font-family:${BRAND.font};font-size:11px;color:rgba(153,184,210,0.46);
                  line-height:1.7;margin:0;">
          You received this because you have a Wasel account.
          <a href="${BRAND.appUrl}/app/settings" style="color:rgba(153,184,210,0.55);">
            Manage notification preferences
          </a>
        </p>
      </td>
    </tr>
  </table>`;
}

// ── Reusable components ───────────────────────────────────────────────────────

export function sectionHeading(text: string): string {
  return `<h2 style="font-family:${BRAND.font};font-size:22px;font-weight:800;
                     color:${BRAND.textPrimary};margin:0 0 8px;line-height:1.2;
                     letter-spacing:-0.03em;">${esc(text)}</h2>`;
}

export function bodyText(html: string): string {
  return `<p style="font-family:${BRAND.font};font-size:15px;color:${BRAND.textSub};
                    line-height:1.75;margin:0 0 20px;">${html}</p>`;
}

export function detailTable(rows: Array<{ label: string; value: string }>): string {
  const cells = rows.map(({ label, value }) => `
    <tr class="detail-row">
      <td style="font-family:${BRAND.font};font-size:12px;font-weight:700;
                 text-transform:uppercase;letter-spacing:0.08em;
                 color:${BRAND.textMuted};padding:10px 14px 10px 0;
                 border-bottom:1px solid ${BRAND.border};width:38%;
                 vertical-align:top;">
        ${esc(label)}
      </td>
      <td style="font-family:${BRAND.font};font-size:14px;font-weight:600;
                 color:${BRAND.textPrimary};padding:10px 0;
                 border-bottom:1px solid ${BRAND.border};
                 vertical-align:top;">
        ${value}
      </td>
    </tr>`).join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="margin:20px 0;">${cells}</table>`;
}

export function infoCard(opts: {
  accent: string;
  icon:   string;
  title:  string;
  body:   string;
}): string {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="margin:20px 0;background:rgba(${hexToRgb(opts.accent)},0.07);
                border-radius:16px;border-left:3px solid ${opts.accent};">
    <tr>
      <td style="padding:18px 20px;">
        <div style="font-size:22px;margin-bottom:8px;">${opts.icon}</div>
        <div style="font-family:${BRAND.font};font-size:14px;font-weight:800;
                    color:${BRAND.textPrimary};margin-bottom:6px;">${esc(opts.title)}</div>
        <div style="font-family:${BRAND.font};font-size:13px;color:${BRAND.textSub};
                    line-height:1.7;">${opts.body}</div>
      </td>
    </tr>
  </table>`;
}

export function ctaButton(opts: {
  label: string;
  url:   string;
  color?: string;
}): string {
  const bg = opts.color ?? BRAND.cyan;
  return `
  <table cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
    <tr>
      <td align="left">
        <a class="cta-btn" href="${opts.url}"
           style="display:inline-block;padding:14px 32px;border-radius:14px;
                  background:${bg};
                  font-family:${BRAND.font};font-size:15px;font-weight:800;
                  color:#041018;text-decoration:none;letter-spacing:-0.01em;">
          ${esc(opts.label)}
        </a>
      </td>
    </tr>
  </table>`;
}

export function divider(): string {
  return `<hr style="border:none;border-top:1px solid ${BRAND.border};margin:28px 0;" />`;
}

export function ticketBadge(code: string): string {
  return `
  <div style="display:inline-block;padding:10px 18px;border-radius:12px;
              background:rgba(22,199,242,0.10);border:1px solid ${BRAND.borderStrong};
              font-family:'Courier New',monospace;font-size:18px;font-weight:800;
              color:${BRAND.cyan};letter-spacing:0.14em;margin:12px 0;">
    ${esc(code)}
  </div>`;
}

export function statusPill(label: string, color: string): string {
  return `<span style="display:inline-block;padding:4px 12px;border-radius:999px;
                       background:rgba(${hexToRgb(color)},0.15);
                       font-family:${BRAND.font};font-size:11px;font-weight:800;
                       color:${color};letter-spacing:0.06em;text-transform:uppercase;">
    ${esc(label)}
  </span>`;
}

// ── Hex helper ────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0,2), 16);
  const g = parseInt(clean.substring(2,4), 16);
  const b = parseInt(clean.substring(4,6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return '22,199,242';
  return `${r},${g},${b}`;
}

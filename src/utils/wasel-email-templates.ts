/**
 * Wasel Branded Email Templates
 *
 * Transactional email templates with consistent branding.
 * All templates use the Wasel design system tokens.
 */

export const EMAIL_TOKENS = {
  colors: {
    ink: '#081D39',
    cyan: '#00E5FF',
    lime: '#72C70D',
    ember: '#FF8A0B',
    rose: '#FF7C8B',
    gold: '#FFBE5C',
    text: '#F8FBFF',
    textMuted: '#95B2C9',
    bg: '#050B14',
    surface: '#0D1B2A',
  },
  fonts: {
    primary: "'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif",
    arabic: "'Cairo', 'Tajawal', 'Plus Jakarta Sans', sans-serif",
    mono: "'JetBrains Mono', 'Fira Mono', monospace",
  },
  spacing: {
    xs: '8px',
    sm: '12px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    full: '9999px',
  },
};

export const EMAIL_BASE_STYLES = `
  body {
    margin: 0;
    padding: 0;
    background-color: #050B14;
    font-family: 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  table {
    border-collapse: collapse;
    mso-table-lspace: 0pt;
    mso-table-rspace: 0pt;
  }
  img {
    border: 0;
    outline: none;
    text-decoration: none;
    -ms-interpolation-mode: bicubic;
  }
  a img {
    border: none;
  }
  .external-class {
    width: 100%;
    min-width: 100%;
  }
`;

export interface EmailTemplate {
  subject: string;
  previewText: string;
  html: string;
  text: string;
}

export function wrapEmailTemplate(content: string, options: { title?: string; ctaText?: string; ctaUrl?: string } = {}): string {
  const { title = 'Wasel', ctaText, ctaUrl } = options;

  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    ${EMAIL_BASE_STYLES}
    .wasel-cyan { color: #00E5FF; }
    .wasel-ink { color: #081D39; }
    .wasel-lime { color: #72C70D; }
    .wasel-ember { color: #FF8A0B; }
    .bg-ink { background-color: #081D39; }
    .bg-cyan { background-color: #00E5FF; }
    .bg-lime { background-color: #72C70D; }
    .bg-ember { background-color: #FF8A0B; }
    .bg-surface { background-color: #0D1B2A; }
    .bg-deep { background-color: #050B14; }
    .btn-primary {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #00E5FF 0%, #38BEFF 52%, #32D8A6 100%);
      color: #081D39;
      text-decoration: none;
      border-radius: 9999px;
      font-weight: 700;
      font-size: 16px;
      letter-spacing: 0.02em;
    }
    .btn-secondary {
      display: inline-block;
      padding: 14px 32px;
      background: transparent;
      color: #00E5FF;
      text-decoration: none;
      border-radius: 9999px;
      font-weight: 600;
      font-size: 16px;
      border: 2px solid rgba(0,229,255,0.3);
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #050B14;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #050B14;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">
          <!-- Header -->
          <tr>
            <td style="padding: 24px; text-align: center; background-color: #0D1B2A; border-radius: 16px 16px 0 0; border-bottom: 1px solid rgba(0,229,255,0.1);">
              <img src="https://wasel14.online/brand/assets/logos/primary/logo-light-160.png" alt="Wasel" width="120" height="38" style="display: block; margin: 0 auto;">
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 32px 24px; background-color: #0D1B2A; border-radius: 0 0 16px 16px;">
              ${content}
              ${ctaText && ctaUrl ? `
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 32px 0; text-align: center;">
                <tr>
                  <td>
                    <a href="${ctaUrl}" class="btn-primary">${ctaText}</a>
                  </td>
                </tr>
              </table>
              ` : ''}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px; text-align: center; color: #95B2C9; font-size: 12px;">
              <p style="margin: 0 0 8px 0;">© 2026 Wasel (واصل). All rights reserved.</p>
              <p style="margin: 0;">
                <a href="https://wasel14.online/privacy" style="color: #00E5FF; text-decoration: none;">Privacy</a>
                &nbsp;·&nbsp;
                <a href="https://wasel14.online/terms" style="color: #00E5FF; text-decoration: none;">Terms</a>
                &nbsp;·&nbsp;
                <a href="https://wasel14.online/support" style="color: #00E5FF; text-decoration: none;">Support</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export const templates = {
  rideConfirmed: (data: { userName: string; rideId: string; driverName: string; pickup: string; dropoff: string; time: string }) => {
    const content = `
      <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: #F8FBFF;">Your ride is confirmed</h1>
      <p style="margin: 0 0 24px 0; color: #95B2C9; font-size: 16px; line-height: 1.6;">Hi ${data.userName}, your ride has been booked successfully.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: rgba(0,229,255,0.06); border: 1px solid rgba(0,229,255,0.16); border-radius: 12px; margin-bottom: 24px;">
        <tr><td style="padding: 20px;">
          <p style="margin: 0 0 12px 0; color: #95B2C9; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em;">Ride Details</p>
          <p style="margin: 0 0 8px 0; color: #F8FBFF; font-size: 16px;"><strong>Driver:</strong> ${data.driverName}</p>
          <p style="margin: 0 0 8px 0; color: #F8FBFF; font-size: 16px;"><strong>Pickup:</strong> ${data.pickup}</p>
          <p style="margin: 0 0 8px 0; color: #F8FBFF; font-size: 16px;"><strong>Dropoff:</strong> ${data.dropoff}</p>
          <p style="margin: 0; color: #F8FBFF; font-size: 16px;"><strong>Time:</strong> ${data.time}</p>
        </td></tr>
      </table>
      <p style="margin: 24px 0 0 0; color: #95B2C9; font-size: 14px;">Track your ride in the app or contact your driver directly.</p>
    `;

    return wrapEmailTemplate(content, {
      title: 'Ride Confirmed',
      ctaText: 'Track Ride',
      ctaUrl: `https://wasel14.online/app/track/${data.rideId}`,
    });
  },

  packageDelivered: (data: { userName: string; packageId: string; trackingCode: string; deliveredAt: string }) => {
    const content = `
      <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: #72C70D;">Package Delivered</h1>
      <p style="margin: 0 0 24px 0; color: #95B2C9; font-size: 16px; line-height: 1.6;">Great news! Your package has been delivered safely.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: rgba(114,199,13,0.06); border: 1px solid rgba(114,199,13,0.16); border-radius: 12px; margin-bottom: 24px;">
        <tr><td style="padding: 20px;">
          <p style="margin: 0 0 8px 0; color: #95B2C9; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em;">Tracking Info</p>
          <p style="margin: 0 0 8px 0; color: #F8FBFF; font-size: 16px;"><strong>Tracking Code:</strong> ${data.trackingCode}</p>
          <p style="margin: 0; color: #F8FBFF; font-size: 16px;"><strong>Delivered:</strong> ${data.deliveredAt}</p>
        </td></tr>
      </table>
      <p style="margin: 24px 0 0 0; color: #95B2C9; font-size: 14px;">Rate your delivery experience in the app.</p>
    `;

    return wrapEmailTemplate(content, {
      title: 'Package Delivered',
      ctaText: 'View Details',
      ctaUrl: `https://wasel14.online/app/packages/${data.packageId}`,
    });
  },

  paymentReceipt: (data: { userName: string; amount: string; currency: string; date: string; transactionId: string; method: string }) => {
    const content = `
      <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: #F8FBFF;">Payment Receipt</h1>
      <p style="margin: 0 0 24px 0; color: #95B2C9; font-size: 16px; line-height: 1.6;">Thank you for your payment, ${data.userName}.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: rgba(0,229,255,0.06); border: 1px solid rgba(0,229,255,0.16); border-radius: 12px; margin-bottom: 24px;">
        <tr><td style="padding: 20px;">
          <p style="margin: 0 0 8px 0; color: #95B2C9; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em;">Amount</p>
          <p style="margin: 0 0 16px 0; color: #00E5FF; font-size: 32px; font-weight: 800;">${data.currency} ${data.amount}</p>
          <p style="margin: 0 0 8px 0; color: #F8FBFF; font-size: 14px;"><strong>Date:</strong> ${data.date}</p>
          <p style="margin: 0 0 8px 0; color: #F8FBFF; font-size: 14px;"><strong>Method:</strong> ${data.method}</p>
          <p style="margin: 0; color: #F8FBFF; font-size: 14px;"><strong>Transaction ID:</strong> ${data.transactionId}</p>
        </td></tr>
      </table>
      <p style="margin: 24px 0 0 0; color: #95B2C9; font-size: 14px;">This receipt is also available in your Wasel wallet.</p>
    `;

    return wrapEmailTemplate(content, {
      title: 'Payment Receipt',
      ctaText: 'View Wallet',
      ctaUrl: 'https://wasel14.online/app/wallet',
    });
  },

  welcome: (data: { userName: string }) => {
    const content = `
      <h1 style="margin: 0 0 16px 0; font-size: 28px; font-weight: 800; color: #F8FBFF; background: linear-gradient(135deg, #00E5FF 0%, #38BEFF 52%, #32D8A6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">Welcome to Wasel</h1>
      <p style="margin: 0 0 24px 0; color: #95B2C9; font-size: 16px; line-height: 1.6;">Hi ${data.userName}, get ready to move through Jordan like never before.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
        <tr>
          <td width="25%" style="text-align: center; padding: 16px 8px;">
            <div style="width: 48px; height: 48px; background: rgba(0,229,255,0.1); border-radius: 12px; margin: 0 auto 8px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 24px;">🚗</span>
            </div>
            <p style="margin: 0; color: #F8FBFF; font-size: 14px; font-weight: 600;">Find Rides</p>
          </td>
          <td width="25%" style="text-align: center; padding: 16px 8px;">
            <div style="width: 48px; height: 48px; background: rgba(114,199,13,0.1); border-radius: 12px; margin: 0 auto 8px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 24px;">📦</span>
            </div>
            <p style="margin: 0; color: #F8FBFF; font-size: 14px; font-weight: 600;">Send Packages</p>
          </td>
          <td width="25%" style="text-align: center; padding: 16px 8px;">
            <div style="width: 48px; height: 48px; background: rgba(255,138,11,0.1); border-radius: 12px; margin: 0 auto 8px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 24px;">🎫</span>
            </div>
            <p style="margin: 0; color: #F8FBFF; font-size: 14px; font-weight: 600;">Bus Passes</p>
          </td>
          <td width="25%" style="text-align: center; padding: 16px 8px;">
            <div style="width: 48px; height: 48px; background: rgba(143,166,255,0.1); border-radius: 12px; margin: 0 auto 8px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 24px;">🛡️</span>
            </div>
            <p style="margin: 0; color: #F8FBFF; font-size: 14px; font-weight: 600;">Trust Score</p>
          </td>
        </tr>
      </table>
    `;

    return wrapEmailTemplate(content, {
      title: 'Welcome to Wasel',
      ctaText: 'Get Started',
      ctaUrl: 'https://wasel14.online/app',
    });
  },

  verificationRequired: (data: { userName: string; verificationType: string }) => {
    const content = `
      <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: #F8FBFF;">Verification Required</h1>
      <p style="margin: 0 0 24px 0; color: #95B2C9; font-size: 16px; line-height: 1.6;">Hi ${data.userName}, please complete your ${data.verificationType} verification to continue using Wasel.</p>
      <p style="margin: 0 0 24px 0; color: #95B2C9; font-size: 14px; line-height: 1.6;">This helps us maintain a safe and trusted community for all users.</p>
    `;

    return wrapEmailTemplate(content, {
      title: 'Verification Required',
      ctaText: 'Verify Now',
      ctaUrl: 'https://wasel14.online/app/trust',
    });
  },
};

export type TemplateName = keyof typeof templates;

export function renderTemplate<K extends keyof typeof templates>(name: K, data: Parameters<(typeof templates)[K]>[0]): EmailTemplate {
  const render = templates[name];
  const html = render(data);

  const textContent = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const subjectMap: Record<TemplateName, string> = {
    rideConfirmed: 'Your Wasel ride is confirmed',
    packageDelivered: 'Your Wasel package has been delivered',
    paymentReceipt: 'Your Wasel payment receipt',
    welcome: 'Welcome to Wasel — Ride. Share. Move.',
    verificationRequired: 'Verification required for your Wasel account',
  };

  return {
    subject: subjectMap[name],
    previewText: textContent.slice(0, 120),
    html,
    text: textContent,
  };
}

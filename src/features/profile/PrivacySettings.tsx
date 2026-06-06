/**
 * Privacy Settings Page
 * GDPR compliance controls
 */

import { C, R } from '../../utils/wasel-ds';

export function PrivacySettings() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1rem', color: C.text }}>
        Privacy Settings
      </h1>
      <p style={{ color: C.textMuted, marginBottom: '2rem' }}>
        Manage your privacy preferences and data
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Data Export */}
        <section
          style={{
            padding: '1.5rem',
            background: C.card,
            border: `1px solid ${C.borderHov}`,
            borderRadius: R.lg,
          }}
        >
          <h2
            style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: C.text }}
          >
            Export Your Data
          </h2>
          <p style={{ color: C.textMuted, marginBottom: '1rem', fontSize: '0.875rem' }}>
            Download a copy of all your personal data stored in Wasel. You will receive an email
            with a download link within 24 hours.
          </p>
          <DataExportButton />
        </section>

        {/* Cookie Preferences */}
        <section
          style={{
            padding: '1.5rem',
            background: C.card,
            border: `1px solid ${C.borderHov}`,
            borderRadius: R.lg,
          }}
        >
          <h2
            style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: C.text }}
          >
            Cookie Preferences
          </h2>
          <p style={{ color: C.textMuted, marginBottom: '1rem', fontSize: '0.875rem' }}>
            Manage your cookie consent preferences. Essential cookies are always enabled.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: C.text }}>
              <input type="checkbox" checked disabled />
              <span>Essential Cookies (Required)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: C.text }}>
              <input type="checkbox" defaultChecked />
              <span>Analytics Cookies</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: C.text }}>
              <input type="checkbox" defaultChecked />
              <span>Marketing Cookies</span>
            </label>
          </div>
        </section>

        {/* Data Retention */}
        <section
          style={{
            padding: '1.5rem',
            background: C.card,
            border: `1px solid ${C.borderHov}`,
            borderRadius: R.lg,
          }}
        >
          <h2
            style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: C.text }}
          >
            Data Retention
          </h2>
          <p style={{ color: C.textMuted, fontSize: '0.875rem' }}>
            We retain your data for as long as your account is active. Trip history is kept for 7
            years for legal compliance.
          </p>
        </section>

        {/* Account Deletion */}
        <section
          style={{
            padding: '1.5rem',
            background: C.errorDim,
            border: `1px solid ${C.error}`,
            borderRadius: R.lg,
          }}
        >
          <h2
            style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: C.text }}
          >
            Delete Account
          </h2>
          <p style={{ color: C.textMuted, marginBottom: '1rem', fontSize: '0.875rem' }}>
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <AccountDeletionDialog />
        </section>
      </div>
    </div>
  );
}

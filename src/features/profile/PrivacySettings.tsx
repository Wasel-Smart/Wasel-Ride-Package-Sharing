/**
 * Privacy Settings Page
 * GDPR compliance controls
 */

import { DataExportButton } from '@/components/gdpr/DataExportButton';
import { AccountDeletionDialog } from '@/components/gdpr/AccountDeletionDialog';
import { C, R } from '../../utils/wasel-ds';
import { tx } from '../../locales/tx';

export function PrivacySettings() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1rem', color: C.text }}>
        {tx('privacySettings.privacy_settings')}
      </h1>
      <p style={{ color: C.textMuted, marginBottom: '2rem' }}>
        {tx('privacySettings.manage_your_privacy_preferences_and_data')}
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
            {tx('privacySettings.export_your_data')}
          </h2>
          <p style={{ color: C.textMuted, marginBottom: '1rem', fontSize: '0.875rem' }}>
            {tx(
              'privacySettings.download_a_copy_of_all_your_personal_data_stored_in_wasel_you_will_receive_an_email_with_a_download_link_within_24_hours',
            )}
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
            {tx('privacySettings.cookie_preferences')}
          </h2>
          <p style={{ color: C.textMuted, marginBottom: '1rem', fontSize: '0.875rem' }}>
            {tx(
              'privacySettings.manage_your_cookie_consent_preferences_essential_cookies_are_always_enabled',
            )}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: C.text }}>
              <input type="checkbox" checked disabled />
              <span>{tx('privacySettings.essential_cookies_required')}</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: C.text }}>
              <input type="checkbox" defaultChecked />
              <span>{tx('privacySettings.analytics_cookies')}</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: C.text }}>
              <input type="checkbox" defaultChecked />
              <span>{tx('privacySettings.marketing_cookies')}</span>
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
            {tx('privacySettings.data_retention')}
          </h2>
          <p style={{ color: C.textMuted, fontSize: '0.875rem' }}>
            {tx(
              'privacySettings.we_retain_your_data_for_as_long_as_your_account_is_active_trip_history_is_kept_for_7_years_for_legal_compliance',
            )}
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
            {tx('settings.danger.deleteAccount')}
          </h2>
          <p style={{ color: C.textMuted, marginBottom: '1rem', fontSize: '0.875rem' }}>
            {tx(
              'privacySettings.permanently_delete_your_account_and_all_associated_data_this_action_cannot_be_undone',
            )}
          </p>
          <AccountDeletionDialog />
        </section>
      </div>
    </div>
  );
}

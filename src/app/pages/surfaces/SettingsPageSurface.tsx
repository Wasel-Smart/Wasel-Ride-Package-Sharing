/**
 * SettingsPageSurface
 *
 * User preferences: theme, language, phone, password.
 * Auth mutations delegate to AuthContext; local profile updates
 * delegate to LocalAuth.
 */
import { useState } from 'react';
import { Button, Card, Input, LayoutContainer, SectionWrapper } from '../../../design-system/components';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useLocalAuth } from '../../../contexts/LocalAuth';
import { useTheme } from '../../../contexts/ThemeContext';
import { PageHeading, ProtectedPage } from './SharedPageComponents';

export function SettingsPage() {
  const { user, updateUser } = useLocalAuth();
  const { changePassword } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { setTheme, theme } = useTheme();

  const [phone, setPhone] = useState(user?.phone ?? '');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const saveSettings = async () => {
    setMessage('');

    if (password) {
      const result = await changePassword(password);
      if (result.error) {
        setMessage(
          result.error instanceof Error ? result.error.message : String(result.error),
        );
        return;
      }
    }

    updateUser({ phone });
    setMessage('Settings saved.');
  };

  return (
    <ProtectedPage>
      <LayoutContainer>
        <div className="ds-page">
          <PageHeading
            description="Control notifications, privacy, security, and account preferences inside one system."
            eyebrow="Settings"
            title="Settings"
          />

          <div className="ds-feature-grid">
            <Card>
              <h2 className="ds-card__title">Theme</h2>
              <div className="ds-minor-actions">
                <Button
                  onClick={() => setTheme('dark')}
                  variant={theme === 'dark' ? 'primary' : 'secondary'}
                >
                  Dark
                </Button>
                <Button
                  onClick={() => setTheme('light')}
                  variant={theme === 'light' ? 'primary' : 'secondary'}
                >
                  Light
                </Button>
              </div>
            </Card>

            <Card>
              <h2 className="ds-card__title">Language</h2>
              <div className="ds-minor-actions">
                <Button
                  onClick={() => setLanguage('en')}
                  variant={language === 'en' ? 'primary' : 'secondary'}
                >
                  English
                </Button>
                <Button
                  onClick={() => setLanguage('ar')}
                  variant={language === 'ar' ? 'primary' : 'secondary'}
                >
                  العربية
                </Button>
              </div>
            </Card>

            <Card>
              <h2 className="ds-card__title">Support</h2>
              <p className="ds-copy ds-copy--tight">
                Critical help stays close to the action.
              </p>
              <Button variant="ghost">Call support</Button>
            </Card>
          </div>

          <SectionWrapper
            description="Keep the settings form direct."
            title="Account preferences"
          >
            <div className="ds-form-grid">
              <Input
                label="Phone number"
                onChange={e => setPhone(e.target.value)}
                placeholder="+962791234567"
                value={phone}
              />
              <Input
                label="New password"
                onChange={e => setPassword(e.target.value)}
                placeholder="Set a stronger password"
                type="password"
                value={password}
              />
            </div>

            {message ? (
              <div className="ds-inline-feedback" data-tone="success">
                {message}
              </div>
            ) : null}

            <Button fullWidth onClick={() => void saveSettings()}>
              Save settings
            </Button>
          </SectionWrapper>
        </div>
      </LayoutContainer>
    </ProtectedPage>
  );
}

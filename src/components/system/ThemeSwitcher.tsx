import { Monitor, Moon, Sun } from 'lucide-react';

import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import type { ThemePreference } from '../../utils/theme';

const FONT = "var(--wasel-font-sans, 'Montserrat', 'Cairo', 'Tajawal', sans-serif)";

const OPTION_META: Record<
  ThemePreference,
  {
    icon: typeof Sun;
    label: { en: string; ar: string };
    description: { en: string; ar: string };
  }
> = {
  light: {
    icon: Sun,
    label: { en: 'Light', ar: 'فاتح' },
    description: {
      en: 'Bright surfaces with softer contrast.',
      ar: 'أسطح فاتحة مع تباين أخف.',
    },
  },
  dark: {
    icon: Moon,
    label: { en: 'Dark', ar: 'داكن' },
    description: {
      en: 'Keep the current low-light look.',
      ar: 'يحافظ على المظهر الداكن الحالي.',
    },
  },
  system: {
    icon: Monitor,
    label: { en: 'System', ar: 'النظام' },
    description: {
      en: 'Follow your device preference live.',
      ar: 'يتبع تفضيل الجهاز مباشرة.',
    },
  },
};

export function ThemeSwitcher() {
  const { language } = useLanguage();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const isArabic = language === 'ar';

  return (
    <div
      role="radiogroup"
      aria-label={isArabic ? 'اختيار السمة' : 'Choose theme'}
      style={{
        display: 'grid',
        gap: 12,
        padding: 18,
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 10,
        }}
      >
        {(['light', 'dark', 'system'] as ThemePreference[]).map((option) => {
          const Icon = OPTION_META[option].icon;
          const active = theme === option;

          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(option)}
              style={{
                display: 'grid',
                gap: 10,
                minHeight: 112,
                padding: '16px 14px',
                borderRadius: 20,
                border: `1px solid ${active ? 'var(--border-strong)' : 'var(--border)'}`,
                background: active
                  ? 'linear-gradient(180deg, rgb(var(--accent-secondary-rgb) / 0.12), rgb(var(--accent-rgb) / 0.08))'
                  : 'var(--surface-muted)',
                color: 'var(--text-primary)',
                boxShadow: active ? 'var(--wasel-button-primary-shadow)' : 'none',
                cursor: 'pointer',
                textAlign: isArabic ? 'right' : 'left',
                fontFamily: FONT,
              }}
            >
              <span
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 14,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: active ? 'rgb(var(--accent-secondary-rgb) / 0.18)' : 'var(--surface-muted-strong)',
                  color: active ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                <Icon size={18} />
              </span>
              <span style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 800 }}>
                  {isArabic ? OPTION_META[option].label.ar : OPTION_META[option].label.en}
                </span>
                <span
                  style={{
                    fontSize: '0.74rem',
                    lineHeight: 1.55,
                    color: 'var(--text-secondary)',
                  }}
                >
                  {isArabic
                    ? OPTION_META[option].description.ar
                    : OPTION_META[option].description.en}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div
        style={{
          padding: '0 2px',
          fontSize: '0.74rem',
          color: 'var(--text-secondary)',
          fontFamily: FONT,
        }}
      >
        {theme === 'system'
          ? isArabic
            ? `مطابق حالياً مع ${resolvedTheme === 'light' ? 'الوضع الفاتح' : 'الوضع الداكن'} في الجهاز.`
            : `Currently matching your device: ${resolvedTheme === 'light' ? 'Light' : 'Dark'}.`
          : isArabic
            ? 'سيتم تطبيق التغيير فوراً على كل الشاشات.'
            : 'The change applies instantly across the app.'}
      </div>
    </div>
  );
}

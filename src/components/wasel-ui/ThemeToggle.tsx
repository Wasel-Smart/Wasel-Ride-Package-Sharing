import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface ThemeToggleProps {
  ar?: boolean;
  style?: React.CSSProperties;
}

/**
 * Compact dark/light toggle. Reads and applies the theme via
 * ThemeContext (data-theme on <html> + persisted preference).
 */
export function ThemeToggle( { ar, style }: ThemeToggleProps ) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const label = isDark
    ? ( ar ? 'التبديل إلى النمط الفاتح' : 'Switch to light mode' )
    : ( ar ? 'التبديل إلى النمط الداكن' : 'Switch to dark mode' );

  return (
    <button
      type="button"
      onClick={ toggleTheme }
      aria-label={ label }
      title={ label }
      aria-pressed={ !isDark }
      style={ {
        width: 34,
        height: 34,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        background: 'var(--wasel-header-icon-bg, rgba(255,255,255,0.06))',
        border: '1px solid var(--border)',
        color: 'var(--foreground)',
        cursor: 'pointer',
        ...style,
      } }
    >
      { isDark ? <Sun size={ 15 } aria-hidden="true" /> : <Moon size={ 15 } aria-hidden="true" /> }
    </button>
  );
}

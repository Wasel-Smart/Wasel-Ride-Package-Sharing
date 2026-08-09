import { ChevronRight } from 'lucide-react';
import { type ReactNode } from 'react';
import { WaselButton, WaselInput, WaselSelect } from '../../../design-system';
import styles from '../../../styles/app-shell.module.css';
import { C, R, TYPE } from '../../../utils/wasel-ds';

export function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className={styles.settingsSection}>
      <div className={styles.settingsSectionHeader}>
        <span className={styles.settingsSectionIcon}>{icon}</span>
        <h3 className={styles.settingsSectionTitle}>{title}</h3>
      </div>
      <div className={styles.settingsSectionContent}>{children}</div>
    </div>
  );
}

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`${styles.settingsToggle} ${value ? styles.settingsToggleActive : ''}`}
    >
      <span
        className={`${styles.settingsToggleThumb} ${value ? styles.settingsToggleThumbActive : ''}`}
      />
    </button>
  );
}

export function ToggleRow({
  label,
  sub,
  value,
  onChange,
}: {
  label: string;
  sub?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className={styles.settingsRow}>
      <div className={styles.settingsRowContent}>
        <div className={styles.settingsRowTitle}>{label}</div>
        {sub ? <div className={styles.settingsRowSub}>{sub}</div> : null}
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  );
}

export function SelectRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className={styles.settingsRow}>
      <div className={styles.settingsRowTitle}>{label}</div>
      <div className={styles.settingsSelectWrap}>
        <WaselSelect
          aria-label={label}
          options={options}
          value={value}
          onChange={onChange}
          containerStyle={{ gap: 0 }}
          style={{ minHeight: 38, fontSize: TYPE.size.sm }}
        />
      </div>
    </div>
  );
}

export function LinkRow({ label, sub, onClick }: { label: string; sub?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={styles.settingsLinkButton}>
      <div className={styles.settingsLinkContent}>
        <div className={styles.settingsLinkTitle}>{label}</div>
        {sub ? <div className={styles.settingsLinkSub}>{sub}</div> : null}
      </div>
      <ChevronRight size={14} className={styles.settingsLinkChevron} />
    </button>
  );
}

export function ActionButton({
  label,
  onClick,
  disabled,
  variant = 'primary',
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}) {
  const buttonVariantStyles = {
    primary: { background: C.cyan, color: C.bgDeep, border: 'none' },
    secondary: {
      background: C.elevated,
      color: C.text,
      border: `1px solid ${C.border}`,
    },
    danger: { background: C.errorDim, color: C.error, border: `1px solid ${C.error}33` },
  } as const;

  return (
    <WaselButton
      type="button"
      onClick={onClick}
      disabled={disabled}
      variant={variant === 'danger' ? 'danger' : variant === 'secondary' ? 'outline' : 'primary'}
      size="sm"
      style={{
        height: 38,
        borderRadius: R.md,
        padding: '0 14px',
        ...buttonVariantStyles[variant],
      }}
    >
      {label}
    </WaselButton>
  );
}

export function FormField({
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return <WaselInput type={type} value={value} onChange={onChange} placeholder={placeholder} />;
}

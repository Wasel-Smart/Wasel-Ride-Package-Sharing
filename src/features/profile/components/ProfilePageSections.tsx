import type { ChangeEventHandler, MutableRefObject } from 'react';
import { Camera, Clock, User } from 'lucide-react';
import { WaselLogo } from '../../../components/wasel-ds/WaselLogo';
import type { WaselUser } from '../../../contexts/LocalAuth';
import {
  PROFILE_BG,
  PROFILE_BORDER,
  PROFILE_CYAN,
  PROFILE_FONT,
  PROFILE_GOLD,
  PROFILE_HOVER,
  type ProfileStatusChip,
  type SavingField,
} from '../useProfilePageController';
import { VerificationBadge } from './ProfilePageParts';

const PROFILE_PANEL = 'var(--wasel-service-card-2)';
const PROFILE_TEXT = 'var(--wasel-service-text)';
const PROFILE_SUB = 'var(--wasel-service-sub)';
const PROFILE_MUTED = 'var(--wasel-service-muted)';

type ProfileSignedOutStateProps = {
  ar: boolean;
  onSignIn: () => void;
};

type ProfileHeroSectionProps = {
  user: WaselUser;
  ar: boolean;
  initials: string;
  roleLabel: string;
  walletStatus: ProfileStatusChip;
  trustTier: string;
  joinedText: string;
  profileCompleteness: number;
  permissionStatus: ProfileStatusChip;
  editingField: 'name' | 'phone' | null;
  nameInput: string;
  savingField: SavingField;
  photoInputRef: MutableRefObject<HTMLInputElement | null>;
  onNameInputChange: (value: string) => void;
  onNameEditStart: () => void;
  onNameEditCancel: () => void;
  onNameSave: () => void | Promise<void>;
  onPhotoSelection: ChangeEventHandler<HTMLInputElement>;
};

type ProfileQuickPhoneEditorProps = {
  ar: boolean;
  phoneInput: string;
  editingField: 'name' | 'phone' | null;
  savingField: SavingField;
  onPhoneInputChange: (value: string) => void;
  onPhoneFocus: () => void;
  onPhoneSave: () => void | Promise<void>;
  onPhoneCancel: () => void;
};

type ProfileDeleteConfirmDialogProps = {
  ar: boolean;
  onCancel: () => void;
  onContinue: () => void | Promise<void>;
};

function ProfileSummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div
      style={{
        borderRadius: 14,
        padding: '12px 13px',
        background: PROFILE_PANEL,
        border: `1px solid ${PROFILE_BORDER}`,
      }}
    >
      <div
        style={{
          fontSize: '0.68rem',
          color: PROFILE_MUTED,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          fontFamily: PROFILE_FONT,
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: '1rem',
          fontWeight: 800,
          color: tone,
          fontFamily: PROFILE_FONT,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ProfileOperationalSummary({
  ar,
  profileCompleteness,
  permissionStatus,
  walletStatus,
  trustTier,
  joinedText,
}: {
  ar: boolean;
  profileCompleteness: number;
  permissionStatus: ProfileStatusChip;
  walletStatus: ProfileStatusChip;
  trustTier: string;
  joinedText: string;
}) {
  return (
    <div
      style={{
        width: '100%',
        marginTop: 16,
        background: PROFILE_PANEL,
        border: `1px solid ${PROFILE_BORDER}`,
        borderRadius: 18,
        padding: 16,
      }}
    >
      <div
        style={{
          color: PROFILE_TEXT,
          fontWeight: 800,
          fontSize: '0.88rem',
          fontFamily: PROFILE_FONT,
          marginBottom: 12,
        }}
      >
        {ar ? '?????? ??????' : 'Account readiness'}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 10,
        }}
      >
        <ProfileSummaryStat
          label={ar ? '?????? ?????' : 'Profile'}
          value={`${profileCompleteness}%`}
          tone={profileCompleteness >= 80 ? PROFILE_GOLD : PROFILE_CYAN}
        />
        <ProfileSummaryStat
          label={ar ? '?????????' : 'Alerts'}
          value={permissionStatus.label}
          tone={permissionStatus.color}
        />
        <ProfileSummaryStat
          label={ar ? '???????' : 'Wallet'}
          value={walletStatus.label}
          tone={walletStatus.color}
        />
        <ProfileSummaryStat
          label={ar ? '?????' : 'Trust'}
          value={trustTier}
          tone={PROFILE_GOLD}
        />
      </div>
      <div
        style={{
          marginTop: 10,
          color: PROFILE_SUB,
          fontSize: '0.74rem',
          lineHeight: 1.55,
          fontFamily: PROFILE_FONT,
        }}
      >
        {ar ? `??? ??? ${joinedText}` : `Member since ${joinedText}`}
      </div>
    </div>
  );
}

export function ProfileSignedOutState({
  ar,
  onSignIn,
}: ProfileSignedOutStateProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: PROFILE_BG,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 16,
        fontFamily: PROFILE_FONT,
      }}
    >
      <User size={40} color={PROFILE_MUTED} />
      <p style={{ color: PROFILE_SUB, fontSize: '0.9rem' }}>
        {ar ? '???? ????? ?????? ?????' : 'Please sign in to view your profile'}
      </p>
      <button
        onClick={onSignIn}
        style={{
          padding: '10px 24px',
          borderRadius: 10,
          background:
            'linear-gradient(135deg, var(--wasel-brand-gradient-start), var(--wasel-brand-gradient-end))',
          border: 'none',
          color: '#FFFDF9',
          fontWeight: 700,
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontFamily: PROFILE_FONT,
        }}
      >
        {ar ? '????? ??????' : 'Sign In'}
      </button>
    </div>
  );
}

export function ProfileHeroSection({
  user,
  ar,
  initials,
  roleLabel,
  walletStatus,
  trustTier,
  joinedText,
  profileCompleteness,
  permissionStatus,
  editingField,
  nameInput,
  savingField,
  photoInputRef,
  onNameInputChange,
  onNameEditStart,
  onNameEditCancel,
  onNameSave,
  onPhotoSelection,
}: ProfileHeroSectionProps) {
  return (
    <div style={{ padding: '40px 0 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <WaselLogo size={28} variant="full" showWordmark={false} />
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <p
          style={{
              margin: 0,
              color: PROFILE_SUB,
              fontSize: '0.82rem',
            lineHeight: 1.6,
            fontFamily: PROFILE_FONT,
          }}
        >
          {ar
            ? '???? ?????? ?????? ?????????? ???? ???? ????.'
            : 'Your account and trust status.'}
        </p>
      </div>
      <input
        ref={(node) => {
          photoInputRef.current = node;
        }}
        type="file"
        accept="image/*"
        onChange={onPhotoSelection}
        style={{ display: 'none' }}
      />
      <div style={{ position: 'relative' }}>
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: '50%',
            background:
              'linear-gradient(135deg, var(--wasel-brand-gradient-start) 0%, var(--wasel-brand-gradient-end) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            fontWeight: 900,
            color: '#FFFDF9',
            boxShadow:
              '0 0 0 3px color-mix(in srgb, var(--wasel-brand-gradient-start) 24%, transparent), 0 8px 32px color-mix(in srgb, var(--wasel-brand-gradient-end) 22%, transparent)',
            overflow: 'hidden',
          }}
        >
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            initials
          )}
        </div>
        <button
          title={ar ? '????? ??????' : 'Change photo'}
          onClick={() => photoInputRef.current?.click()}
          disabled={savingField === 'photo'}
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: PROFILE_PANEL,
            border: `2px solid ${PROFILE_BG}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: savingField === 'photo' ? 'not-allowed' : 'pointer',
            opacity: savingField === 'photo' ? 0.65 : 1,
          }}
        >
          {savingField === 'photo' ? <Clock size={12} color={PROFILE_CYAN} /> : <Camera size={12} color={PROFILE_CYAN} />}
        </button>
      </div>

      {editingField === 'name' ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%', maxWidth: 320 }}>
          <input
            value={nameInput}
            onChange={(event) => onNameInputChange(event.target.value)}
            autoFocus
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 8,
              border: `1.5px solid ${PROFILE_CYAN}`,
              background: 'color-mix(in srgb, var(--wasel-app-blue) 8%, transparent)',
              color: PROFILE_TEXT,
              fontSize: '0.9rem',
              fontFamily: PROFILE_FONT,
              outline: 'none',
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void onNameSave();
              if (event.key === 'Escape') onNameEditCancel();
            }}
            maxLength={60}
          />
          <button
            onClick={() => void onNameSave()}
            disabled={savingField !== null}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              background: PROFILE_CYAN,
              border: 'none',
              color: '#FFFDF9',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontFamily: PROFILE_FONT,
            }}
          >
            {savingField === 'name' ? '...' : (ar ? '???' : 'Save')}
          </button>
          <button
            onClick={onNameEditCancel}
            style={{
              padding: '8px 10px',
              borderRadius: 8,
              background: PROFILE_PANEL,
              border: `1px solid ${PROFILE_BORDER}`,
              color: PROFILE_SUB,
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontFamily: PROFILE_FONT,
            }}
          >
            {ar ? '?????' : 'Cancel'}
          </button>
        </div>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: PROFILE_TEXT, fontFamily: PROFILE_FONT, margin: 0 }}>
            {user.name}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            <span style={{ fontSize: '0.66rem', padding: '4px 9px', borderRadius: 999, color: PROFILE_CYAN, background: 'color-mix(in srgb, var(--wasel-app-blue) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--wasel-app-blue) 26%, transparent)', fontFamily: PROFILE_FONT, fontWeight: 700 }}>
              {roleLabel}
            </span>
            <span style={{ fontSize: '0.66rem', padding: '4px 9px', borderRadius: 999, color: walletStatus.color, background: `${walletStatus.color}1A`, border: `1px solid ${walletStatus.color}33`, fontFamily: PROFILE_FONT, fontWeight: 700 }}>
              {ar ? '???????' : 'Wallet'}: {walletStatus.label}
            </span>
            <span style={{ fontSize: '0.66rem', padding: '4px 9px', borderRadius: 999, color: PROFILE_MUTED, background: 'rgba(148,163,184,0.12)', border: '1px solid rgba(148,163,184,0.2)', fontFamily: PROFILE_FONT, fontWeight: 700 }}>
              {ar ? '??? ?????' : 'Profile'}
            </span>
          </div>
          <button
            onClick={onNameEditStart}
            style={{ fontSize: '0.72rem', color: PROFILE_CYAN, background: 'none', border: 'none', cursor: 'pointer', marginTop: 8, fontFamily: PROFILE_FONT }}
          >
            {ar ? '????? ?????' : 'Edit name'}
          </button>
        </div>
      )}

      <VerificationBadge level={user.verificationLevel ?? 'level_0'} ar={ar} accent={PROFILE_CYAN} />
      <p style={{ color: PROFILE_SUB, fontSize: '0.82rem', fontFamily: PROFILE_FONT, margin: 0 }}>{user.email}</p>
      <p style={{ color: PROFILE_SUB, fontSize: '0.76rem', fontFamily: PROFILE_FONT, margin: 0, textAlign: 'center', lineHeight: 1.5 }}>
        {ar ? `???? ????? ${user.trustScore}/100` : `Trust score ${user.trustScore}/100`}
      </p>

      <ProfileOperationalSummary
        ar={ar}
        profileCompleteness={profileCompleteness}
        permissionStatus={permissionStatus}
        walletStatus={walletStatus}
        trustTier={trustTier}
        joinedText={joinedText}
      />
    </div>
  );
}

export function ProfileQuickPhoneEditor({
  ar,
  phoneInput,
  editingField,
  savingField,
  onPhoneInputChange,
  onPhoneFocus,
  onPhoneSave,
  onPhoneCancel,
}: ProfileQuickPhoneEditorProps) {
  return (
    <div style={{ padding: 18, display: 'grid', gap: 14 }}>
      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{ fontSize: '0.72rem', color: PROFILE_SUB, fontFamily: PROFILE_FONT, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {ar ? '??? ??????' : 'Phone number'}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            value={phoneInput}
            onChange={(event) => onPhoneInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void onPhoneSave();
              if (event.key === 'Escape') onPhoneCancel();
            }}
            onFocus={onPhoneFocus}
            placeholder="+962791234567"
            style={{
              flex: '1 1 220px',
              minWidth: 0,
              padding: '10px 12px',
              borderRadius: 10,
              border: `1px solid ${editingField === 'phone' ? PROFILE_CYAN : PROFILE_BORDER}`,
              background: 'color-mix(in srgb, var(--wasel-app-blue) 8%, transparent)',
              color: PROFILE_TEXT,
              fontSize: '0.88rem',
              fontFamily: PROFILE_FONT,
              outline: 'none',
            }}
          />
          <button
            onClick={() => void onPhoneSave()}
            disabled={savingField !== null}
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              background: PROFILE_CYAN,
              border: 'none',
              color: '#FFFDF9',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontFamily: PROFILE_FONT,
            }}
          >
            {savingField === 'phone' ? '...' : (ar ? '??? ??????' : 'Save phone')}
          </button>
        </div>
        <div style={{ fontSize: '0.74rem', color: PROFILE_SUB, fontFamily: PROFILE_FONT }}>
          {ar ? '??????? ????????? ??????? ?????? ???????.' : 'Used for alerts and verification.'}
        </div>
      </div>
    </div>
  );
}

export function ProfileDeleteConfirmDialog({
  ar,
  onCancel,
  onContinue,
}: ProfileDeleteConfirmDialogProps) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'var(--wasel-service-card)', border: '1px solid color-mix(in srgb, var(--wasel-brand-hover) 28%, transparent)', borderRadius: 16, padding: 28, maxWidth: 360, width: '100%' }}>
        <h3 style={{ color: PROFILE_HOVER, fontFamily: PROFILE_FONT, fontWeight: 800, fontSize: '1.1rem', marginBottom: 10 }}>
          {ar ? '??? ??? ??????' : 'Request Account Deletion'}
        </h3>
        <p style={{ color: PROFILE_SUB, fontFamily: PROFILE_FONT, fontSize: '0.85rem', marginBottom: 20 }}>
          {ar
            ? '????? ?????? ??? ???? ?? ??? ????? ?????. ????? ????? ???? ?????? ??????? ?? ????? ?????? ??? ????? ??? ?????.'
            : 'Full account deletion is not available from this screen yet. We will sign you out now so you can safely continue a deletion request through support.'}
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            style={{ flex: 1, height: 40, borderRadius: 10, background: 'transparent', border: `1px solid ${PROFILE_BORDER}`, color: PROFILE_SUB, fontFamily: PROFILE_FONT, cursor: 'pointer' }}
          >
            {ar ? '?????' : 'Cancel'}
          </button>
          <button
            onClick={() => void onContinue()}
            style={{ flex: 1, height: 40, borderRadius: 10, background: 'color-mix(in srgb, var(--wasel-brand-hover) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--wasel-brand-hover) 28%, transparent)', color: PROFILE_HOVER, fontFamily: PROFILE_FONT, fontWeight: 700, cursor: 'pointer' }}
          >
            {ar ? '??????' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}



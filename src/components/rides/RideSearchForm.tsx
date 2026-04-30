import { Calendar, Clock3, Search, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import {
  panelStyle,
  LANDING_COLORS,
  FONT_DISPLAY as LANDING_DISPLAY,
} from '../../styles/shared-ui';
import { FONT_DISPLAY as LANDING_FONT } from '../../styles/shared-ui';
import type { RideSearchState } from '../../modules/rides/ride.types';
import { LocationInput } from './LocationInput';

export interface RideSearchFormCopy {
  badge: string;
  title: string;
  description: string;
  searchModeLabel: string;
  modeNowLabel: string;
  modeScheduleLabel: string;
  fromLabel: string;
  fromPlaceholder: string;
  fromHelperText: string;
  autoDetectLabel: string;
  toLabel: string;
  toPlaceholder: string;
  toHelperText: string;
  rideTypeLabel: string;
  rideTypeOptions: Array<{
    value: RideSearchState['draft']['rideType'];
    label: string;
  }>;
  departureLabel: string;
  liveDepartureTitle: string;
  liveDepartureHint: string;
  searchButton: string;
  searchingButton: string;
}

interface RideSearchFormProps {
  state: RideSearchState;
  minDate: string;
  copy: RideSearchFormCopy;
  onFromQueryChange: (value: string) => void;
  onToQueryChange: (value: string) => void;
  onFromCommit: (value: string) => void;
  onToCommit: (value: string) => void;
  onAutoDetectOrigin: () => void;
  onModeChange: (value: RideSearchState['draft']['mode']) => void;
  onDateChange: (value: string) => void;
  onRideTypeChange: (value: RideSearchState['draft']['rideType']) => void;
  onSubmit: () => void;
}

export function RideSearchForm({
  state,
  minDate,
  copy,
  onFromQueryChange,
  onToQueryChange,
  onFromCommit,
  onToCommit,
  onAutoDetectOrigin,
  onModeChange,
  onDateChange,
  onRideTypeChange,
  onSubmit,
}: RideSearchFormProps) {
  const busy = state.phase === 'searching';

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      <section
        className="landing-glow-card"
        style={{
          ...panelStyle(32),
          padding: '32px clamp(24px, 4vw, 40px)',
          display: 'grid',
          gap: 28,
          background:
            'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 20,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'grid', gap: 12, flex: 1, minWidth: 280 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                borderRadius: 999,
                width: 'fit-content',
                border: `1px solid ${LANDING_COLORS.cyan}40`,
                background: `${LANDING_COLORS.cyan}15`,
                color: LANDING_COLORS.cyan,
                fontFamily: LANDING_FONT,
                fontSize: '0.72rem',
                fontWeight: 800,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              <Sparkles size={13} />
              {copy.badge}
            </span>
            <h2
              style={{
                margin: 0,
                color: '#fff',
                fontFamily: LANDING_DISPLAY,
                fontSize: 'clamp(1.6rem, 3vw, 2.4rem)',
                lineHeight: 1.1,
                fontWeight: 700,
              }}
            >
              {copy.title}
            </h2>
            <p
              style={{
                margin: 0,
                color: LANDING_COLORS.muted,
                fontFamily: LANDING_FONT,
                fontSize: '1rem',
                maxWidth: 560,
                lineHeight: 1.65,
              }}
            >
              {copy.description}
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gap: 10,
              minWidth: 200,
            }}
          >
            <div
              style={{
                color: LANDING_COLORS.soft,
                fontFamily: LANDING_FONT,
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
              }}
            >
              {copy.searchModeLabel}
            </div>
            <div
              style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}
            >
              {(['now', 'schedule'] as const).map(mode => {
                const active = state.draft.mode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onModeChange(mode)}
                    style={{
                      minHeight: 52,
                      borderRadius: 14,
                      border: `1px solid ${active ? LANDING_COLORS.cyan : LANDING_COLORS.border}`,
                      background: active
                        ? 'linear-gradient(135deg, rgba(6,182,212,0.2) 0%, rgba(6,182,212,0.1) 100%)'
                        : 'rgba(255,255,255,0.05)',
                      color: active ? LANDING_COLORS.cyan : LANDING_COLORS.soft,
                      fontFamily: LANDING_FONT,
                      fontSize: '0.9rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <Clock3 size={16} />
                    {mode === 'now' ? copy.modeNowLabel : copy.modeScheduleLabel}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div
          className="landing-action-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 16,
          }}
        >
          <LocationInput
            id="ride-from"
            label={copy.fromLabel}
            placeholder={copy.fromPlaceholder}
            accent={LANDING_COLORS.cyan}
            value={state.draft.fromQuery}
            committedValue={state.draft.from}
            suggestions={state.fromSuggestions}
            loading={state.detectingOrigin}
            error={state.validation.from}
            helperText={copy.fromHelperText}
            autoDetectLabel={copy.autoDetectLabel}
            onChange={onFromQueryChange}
            onCommit={onFromCommit}
            onAutoDetect={onAutoDetectOrigin}
          />

          <LocationInput
            id="ride-to"
            label={copy.toLabel}
            placeholder={copy.toPlaceholder}
            accent={LANDING_COLORS.gold}
            value={state.draft.toQuery}
            committedValue={state.draft.to}
            suggestions={state.toSuggestions}
            error={state.validation.to}
            helperText={copy.toHelperText}
            onChange={onToQueryChange}
            onCommit={onToCommit}
          />
        </div>

        <div
          className="landing-action-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr 1fr',
            gap: 16,
            alignItems: 'end',
          }}
        >
          <div style={{ display: 'grid', gap: 10 }}>
            <label
              htmlFor="ride-type"
              style={{
                color: LANDING_COLORS.soft,
                fontFamily: LANDING_FONT,
                fontSize: '0.78rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              {copy.rideTypeLabel}
            </label>
            <select
              id="ride-type"
              aria-label={copy.rideTypeLabel}
              value={state.draft.rideType}
              onChange={event =>
                onRideTypeChange(event.target.value as RideSearchState['draft']['rideType'])
              }
              style={{
                minHeight: 56,
                borderRadius: 16,
                border: `1px solid ${LANDING_COLORS.border}`,
                background: 'rgba(255,255,255,0.06)',
                color: '#fff',
                padding: '0 18px',
                fontFamily: LANDING_FONT,
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {copy.rideTypeOptions.map(rideType => (
                <option
                  key={rideType.value}
                  value={rideType.value}
                  style={{ background: '#1a1a2e' }}
                >
                  {rideType.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            <label
              htmlFor={state.draft.mode === 'schedule' ? 'ride-date' : undefined}
              style={{
                color: LANDING_COLORS.soft,
                fontFamily: LANDING_FONT,
                fontSize: '0.78rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              {copy.departureLabel}
            </label>
            {state.draft.mode === 'now' ? (
              <div
                role="note"
                style={{
                  minHeight: 56,
                  borderRadius: 16,
                  border: `1px solid ${LANDING_COLORS.border}`,
                  background: 'rgba(255,255,255,0.05)',
                  padding: '14px 16px',
                  display: 'grid',
                  gap: 6,
                  alignContent: 'center',
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    color: '#fff',
                    fontFamily: LANDING_FONT,
                    fontSize: '0.92rem',
                    fontWeight: 800,
                  }}
                >
                  <Clock3 size={16} color={LANDING_COLORS.cyan} />
                  {copy.liveDepartureTitle}
                </div>
                <div
                  style={{
                    color: LANDING_COLORS.muted,
                    fontFamily: LANDING_FONT,
                    fontSize: '0.8rem',
                    lineHeight: 1.5,
                  }}
                >
                  {copy.liveDepartureHint}
                </div>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <Calendar
                  size={18}
                  color={LANDING_COLORS.muted}
                  style={{ position: 'absolute', left: 16, top: 19, pointerEvents: 'none' }}
                />
                <input
                  id="ride-date"
                  aria-label="Departure date"
                  type="date"
                  min={minDate}
                  value={state.draft.date}
                  onChange={event => onDateChange(event.target.value)}
                  style={{
                    width: '100%',
                    minHeight: 56,
                    borderRadius: 16,
                    border: `1px solid ${state.validation.date ? '#ff6b6b' : LANDING_COLORS.border}`,
                    background: 'rgba(255,255,255,0.06)',
                    color: '#fff',
                    padding: '0 18px 0 48px',
                    fontFamily: LANDING_FONT,
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    colorScheme: 'dark',
                    outline: 'none',
                  }}
                />
              </div>
            )}
            <div
              style={{
                minHeight: 18,
                color: '#ff8a8a',
                fontFamily: LANDING_FONT,
                fontSize: '0.76rem',
              }}
            >
              {state.draft.mode === 'schedule' ? (state.validation.date ?? '') : ''}
            </div>
          </div>

          <div
            style={{
              position: 'sticky',
              bottom: 12,
              zIndex: 3,
            }}
          >
            <button
              type="button"
              data-testid="find-ride-search"
              aria-label={copy.searchButton}
              onClick={onSubmit}
              disabled={busy}
              style={{
                width: '100%',
                minHeight: 56,
                borderRadius: 16,
                border: 'none',
                background: busy
                  ? 'rgba(255,255,255,0.1)'
                  : 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                color: busy ? LANDING_COLORS.soft : '#fff',
                fontFamily: LANDING_FONT,
                fontSize: '1rem',
                fontWeight: 900,
                cursor: busy ? 'progress' : 'pointer',
                boxShadow: busy ? 'none' : '0 8px 25px -5px rgba(6,182,212,0.4)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                transition: 'all 0.2s ease',
              }}
            >
              <Search size={20} />
              {busy ? copy.searchingButton : copy.searchButton}
            </button>
          </div>
        </div>
      </section>
    </motion.div>
  );
}

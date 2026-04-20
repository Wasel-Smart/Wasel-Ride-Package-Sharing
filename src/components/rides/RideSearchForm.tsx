import { Calendar, Clock3, Search, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { LANDING_COLORS, landingPanel } from '../../features/home/landing/landingTypes';
import { LANDING_DISPLAY, LANDING_FONT } from '../../features/home/landingConstants';
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
          ...landingPanel(32),
          padding: '24px clamp(18px, 3vw, 30px)',
          display: 'grid',
          gap: 22,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'grid', gap: 8 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderRadius: 999,
                width: 'fit-content',
                border: `1px solid ${LANDING_COLORS.border}`,
                background: 'rgba(255,255,255,0.04)',
                color: LANDING_COLORS.cyan,
                fontFamily: LANDING_FONT,
                fontSize: '0.78rem',
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              <Sparkles size={14} />
              {copy.badge}
            </span>
            <h2
              style={{
                margin: 0,
                color: LANDING_COLORS.text,
                fontFamily: LANDING_DISPLAY,
                fontSize: 'clamp(1.45rem, 2.8vw, 2.2rem)',
                lineHeight: 1.05,
              }}
            >
              {copy.title}
            </h2>
            <p
              style={{
                margin: 0,
                color: LANDING_COLORS.muted,
                fontFamily: LANDING_FONT,
                fontSize: '0.98rem',
                maxWidth: 640,
                lineHeight: 1.6,
              }}
            >
              {copy.description}
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gap: 10,
              minWidth: 220,
            }}
          >
            <div
              style={{
                color: LANDING_COLORS.soft,
                fontFamily: LANDING_FONT,
                fontSize: '0.8rem',
                fontWeight: 700,
              }}
            >
              {copy.searchModeLabel}
            </div>
            <div
              style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}
            >
              {(['now', 'schedule'] as const).map(mode => {
                const active = state.draft.mode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onModeChange(mode)}
                    style={{
                      minHeight: 48,
                      borderRadius: 16,
                      border: `1px solid ${active ? LANDING_COLORS.cyan : LANDING_COLORS.border}`,
                      background: active ? 'rgba(32,216,255,0.12)' : 'rgba(255,255,255,0.04)',
                      color: LANDING_COLORS.text,
                      fontFamily: LANDING_FONT,
                      fontSize: '0.92rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
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
                fontSize: '0.82rem',
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
                minHeight: 58,
                borderRadius: 20,
                border: `1px solid ${LANDING_COLORS.border}`,
                background: 'rgba(255,255,255,0.06)',
                color: LANDING_COLORS.text,
                padding: '0 18px',
                fontFamily: LANDING_FONT,
                fontSize: '0.98rem',
                fontWeight: 700,
              }}
            >
              {copy.rideTypeOptions.map(rideType => (
                <option key={rideType.value} value={rideType.value}>
                  {rideType.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            <label
              htmlFor="ride-date"
              style={{
                color: LANDING_COLORS.soft,
                fontFamily: LANDING_FONT,
                fontSize: '0.82rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              {copy.departureLabel}
            </label>
            <div style={{ position: 'relative' }}>
              <Calendar
                size={18}
                color={LANDING_COLORS.muted}
                style={{ position: 'absolute', left: 18, top: 20, pointerEvents: 'none' }}
              />
              <input
                id="ride-date"
                aria-label="Departure date"
                type="date"
                min={minDate}
                disabled={state.draft.mode === 'now'}
                value={state.draft.date}
                onChange={event => onDateChange(event.target.value)}
                style={{
                  width: '100%',
                  minHeight: 58,
                  borderRadius: 20,
                  border: `1px solid ${state.validation.date ? '#ff8f8f' : LANDING_COLORS.border}`,
                  background:
                    state.draft.mode === 'now'
                      ? 'rgba(255,255,255,0.03)'
                      : 'rgba(255,255,255,0.06)',
                  color: LANDING_COLORS.text,
                  padding: '0 18px 0 48px',
                  fontFamily: LANDING_FONT,
                  fontSize: '0.98rem',
                  fontWeight: 700,
                  opacity: state.draft.mode === 'now' ? 0.66 : 1,
                  colorScheme: 'dark',
                }}
              />
            </div>
            <div
              style={{
                minHeight: 18,
                color: '#ffb3b3',
                fontFamily: LANDING_FONT,
                fontSize: '0.78rem',
              }}
            >
              {state.validation.date ?? ''}
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
                minHeight: 58,
                borderRadius: 20,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'linear-gradient(135deg, #20D8FF 0%, #B7FF2B 100%)',
                color: '#041521',
                fontFamily: LANDING_FONT,
                fontSize: '0.98rem',
                fontWeight: 900,
                cursor: busy ? 'progress' : 'pointer',
                boxShadow: '0 24px 60px rgba(32,216,255,0.28)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              <Search size={18} />
              {busy ? copy.searchingButton : copy.searchButton}
            </button>
          </div>
        </div>
      </section>
    </motion.div>
  );
}

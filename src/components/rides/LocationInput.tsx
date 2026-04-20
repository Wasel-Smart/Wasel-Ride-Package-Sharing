import { useMemo, useState } from 'react';
import { LoaderCircle, LocateFixed, MapPin } from 'lucide-react';
import { LANDING_COLORS, landingPanel } from '../../features/home/landing/landingTypes';
import { LANDING_FONT } from '../../features/home/landingConstants';
import type { RideSuggestion } from '../../modules/rides/ride.types';

interface LocationInputProps {
  id: string;
  label: string;
  placeholder: string;
  accent: string;
  value: string;
  committedValue: string;
  suggestions: RideSuggestion[];
  loading?: boolean | undefined;
  error?: string | undefined;
  helperText?: string | undefined;
  autoDetectLabel?: string | undefined;
  onChange: (value: string) => void;
  onCommit: (value: string) => void;
  onAutoDetect?: () => void;
}

export function LocationInput({
  id,
  label,
  placeholder,
  accent,
  value,
  committedValue,
  suggestions,
  loading = false,
  error,
  helperText,
  autoDetectLabel,
  onChange,
  onCommit,
  onAutoDetect,
}: LocationInputProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [focused, setFocused] = useState(false);
  const listId = `${id}-listbox`;
  const showSuggestions = focused && suggestions.length > 0 && value.trim().length > 0;

  const activeSuggestion = useMemo(
    () => suggestions[Math.min(activeIndex, Math.max(0, suggestions.length - 1))],
    [activeIndex, suggestions],
  );

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
      >
        <label
          htmlFor={id}
          style={{
            fontFamily: LANDING_FONT,
            fontSize: '0.82rem',
            fontWeight: 700,
            color: LANDING_COLORS.soft,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </label>
        {onAutoDetect ? (
          <button
            type="button"
            onClick={onAutoDetect}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              border: `1px solid ${LANDING_COLORS.border}`,
              borderRadius: 999,
              background: 'rgba(255,255,255,0.04)',
              color: LANDING_COLORS.text,
              fontFamily: LANDING_FONT,
              fontSize: '0.78rem',
              fontWeight: 700,
              padding: '8px 12px',
              cursor: 'pointer',
            }}
          >
            {loading ? (
              <LoaderCircle size={14} className="landing-live-dot" />
            ) : (
              <LocateFixed size={14} />
            )}
            {autoDetectLabel}
          </button>
        ) : null}
      </div>

      <div style={{ position: 'relative' }}>
        <MapPin
          size={18}
          color={accent}
          style={{ position: 'absolute', left: 18, top: 18, pointerEvents: 'none' }}
        />
        <input
          id={id}
          aria-label={label}
          aria-invalid={Boolean(error)}
          aria-controls={showSuggestions ? listId : undefined}
          aria-expanded={showSuggestions}
          aria-activedescendant={activeSuggestion ? `${id}-option-${activeIndex}` : undefined}
          autoComplete="off"
          role="combobox"
          value={value}
          placeholder={placeholder}
          onChange={event => {
            setActiveIndex(0);
            onChange(event.target.value);
          }}
          onFocus={() => {
            setFocused(true);
          }}
          onBlur={() => {
            setFocused(false);
            const nextValue = value.trim() || committedValue;
            onCommit(nextValue);
          }}
          onKeyDown={event => {
            if (!showSuggestions) {
              if (event.key === 'Enter') {
                onCommit(value.trim() || committedValue);
              }
              return;
            }

            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setActiveIndex(index => Math.min(index + 1, suggestions.length - 1));
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActiveIndex(index => Math.max(index - 1, 0));
            }
            if (event.key === 'Enter') {
              event.preventDefault();
              setFocused(false);
              onCommit(activeSuggestion?.value ?? value.trim() ?? committedValue);
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              setFocused(false);
              onCommit(committedValue);
            }
          }}
          style={{
            width: '100%',
            minHeight: 58,
            borderRadius: 20,
            border: `1px solid ${error ? '#ff8f8f' : LANDING_COLORS.border}`,
            background: 'rgba(255,255,255,0.06)',
            color: LANDING_COLORS.text,
            padding: '0 18px 0 48px',
            fontFamily: LANDING_FONT,
            fontSize: '1rem',
            fontWeight: 700,
            outline: 'none',
            boxShadow: error ? '0 0 0 3px rgba(255,143,143,0.14)' : 'none',
          }}
        />

        {showSuggestions ? (
          <div
            id={listId}
            role="listbox"
            style={{
              ...landingPanel(20),
              position: 'absolute',
              left: 0,
              right: 0,
              top: 'calc(100% + 8px)',
              padding: 8,
              zIndex: 5,
            }}
          >
            {suggestions.map((suggestion, index) => {
              const active = activeIndex === index;
              return (
                <button
                  key={suggestion.value}
                  id={`${id}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onMouseDown={event => {
                    event.preventDefault();
                    setFocused(false);
                    onCommit(suggestion.value);
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  style={{
                    width: '100%',
                    border: 'none',
                    background: active ? 'rgba(32,216,255,0.12)' : 'transparent',
                    borderRadius: 16,
                    color: LANDING_COLORS.text,
                    textAlign: 'left',
                    padding: '12px 14px',
                    display: 'grid',
                    gap: 4,
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontFamily: LANDING_FONT, fontWeight: 700, fontSize: '0.94rem' }}>
                    {suggestion.label}
                  </span>
                  <span
                    style={{
                      fontFamily: LANDING_FONT,
                      fontSize: '0.76rem',
                      color: LANDING_COLORS.muted,
                    }}
                  >
                    {suggestion.supportingText}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div
        style={{
          minHeight: 18,
          fontFamily: LANDING_FONT,
          fontSize: '0.78rem',
          color: error ? '#ffb3b3' : LANDING_COLORS.muted,
        }}
      >
        {error ?? helperText ?? ''}
      </div>
    </div>
  );
}

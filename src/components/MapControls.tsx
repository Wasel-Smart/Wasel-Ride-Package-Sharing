import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  MapPin,
  Radio,
  Locate,
  Navigation2,
  Map,
  Mountain,
  Satellite,
} from 'lucide-react';
import { colors, radii, shadows, effects, gradients, typography } from '../styles/design-tokens';
import { getCurrentLang } from '../locales/tx';

export type MapType = 'roadmap' | 'satellite' | 'terrain';

const CONTROL_PANEL_STYLE = {
  background: colors.background.panel,
  backdropFilter: effects.backdropFilter,
  WebkitBackdropFilter: effects.backdropFilter,
  border: `1px solid ${colors.border.primary}`,
  boxShadow: shadows.lg,
} as const;

const CONTROL_BUTTON_BASE = {
  appearance: 'none' as const,
  border: 'none',
  outline: 'none',
  cursor: 'pointer',
  transition: 'all 180ms ease',
  color: colors.text.light,
  background: 'transparent',
} as const;

function mapTypeButtonStyle(active: boolean) {
  return {
    ...CONTROL_BUTTON_BASE,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    minHeight: 40,
    padding: '0 14px',
    justifyContent: 'flex-start',
    fontSize: typography.size.sm,
    fontWeight: typography.weight.extrabold,
    letterSpacing: '0.02em',
    color: active ? colors.text.dark : colors.text.primary,
    background: active ? gradients.primary : colors.background.input,
    boxShadow: active ? shadows.active : 'none',
  } as const;
}

function compactControlButtonStyle(active = false) {
  return {
    ...CONTROL_BUTTON_BASE,
    width: 40,
    height: 40,
    borderRadius: radii.xl,
    minHeight: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: active ? gradients.primaryActive : colors.background.light,
    border: `1px solid ${active ? colors.border.activeLight : colors.border.primary}`,
    color: active ? colors.text.dark : colors.text.light,
    boxShadow: active ? shadows.active : shadows.md,
  } as const;
}

function wideControlButtonStyle(active = false) {
  return {
    ...CONTROL_BUTTON_BASE,
    minHeight: 40,
    padding: '0 14px',
    borderRadius: radii.xl,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    background: active ? gradients.primaryActive : colors.background.light,
    border: `1px solid ${active ? colors.border.activeLight : colors.border.primary}`,
    color: active ? colors.text.dark : colors.text.light,
    boxShadow: active ? shadows.active : shadows.md,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.extrabold,
    letterSpacing: '0.02em',
    whiteSpace: 'nowrap' as const,
  } as const;
}

export function MapControls({
  isFullscreen,
  toggleFullscreen,
  zoomIn,
  zoomOut,
  mapType,
  changeMapType,
  mosquesOn,
  toggleMosques,
  radarsOn,
  toggleRadars,
  isTracking,
  startTracking,
  stopTracking,
  centerOnMe,
  compact,
  tx: t,
}: {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  mapType: MapType;
  changeMapType: (type: MapType) => void;
  mosquesOn: boolean;
  toggleMosques: () => void;
  radarsOn: boolean;
  toggleRadars: () => void;
  isTracking: boolean;
  startTracking: () => void;
  stopTracking: () => void;
  centerOnMe: () => void;
  compact: boolean;
  tx: (key: string) => string;
}) {
  const mapTypeLabel = (type: MapType) => {
    const ar = getCurrentLang() === 'ar';
    if (type === 'roadmap') return ar ? 'خريطة الطرق' : 'Road map';
    if (type === 'satellite') return ar ? 'قمر صناعي' : 'Satellite';
    return ar ? 'تضاريس' : 'Terrain';
  };

  return (
    <>
      {/* -- Top-right: Map type + zoom + fullscreen -- */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
        <div className="flex flex-col overflow-hidden" style={{ ...CONTROL_PANEL_STYLE, borderRadius: radii['2xl'] }}>
          {(['roadmap', 'satellite', 'terrain'] as const).map(type => (
            <button key={type} onClick={() => changeMapType(type)} style={mapTypeButtonStyle(mapType === type)}>
              {type === 'roadmap' ? (
                <Map className="w-3.5 h-3.5" />
              ) : type === 'satellite' ? (
                <Satellite className="w-3.5 h-3.5" />
              ) : (
                <Mountain className="w-3.5 h-3.5" />
              )}
              <span>{mapTypeLabel(type)}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col overflow-hidden" style={{ ...CONTROL_PANEL_STYLE, borderRadius: radii['2xl'] }}>
          <button onClick={zoomIn} style={compactControlButtonStyle()}>
            <ZoomIn className="w-4 h-4" />
          </button>
          <div style={{ height: 1, background: colors.border.light }} />
          <button onClick={zoomOut} style={compactControlButtonStyle()}>
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>

        <button onClick={toggleFullscreen} style={compactControlButtonStyle(isFullscreen)}>
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* -- Bottom: Layer controls -- */}
      {!compact && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-20">
          <div
            className="flex items-center gap-1 px-3 py-2"
            style={{ ...CONTROL_PANEL_STYLE, borderRadius: radii['2xl'] }}
          >
            <button
              onClick={toggleMosques}
              style={wideControlButtonStyle(mosquesOn)}
              title={t('waselMap.mosques')}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>{t('waselMap.mosques_2')}</span>
            </button>
            <div style={{ width: 1, height: 24, background: colors.border.light }} />
            <button
              onClick={toggleRadars}
              style={wideControlButtonStyle(radarsOn)}
              title={t('waselMap.radars')}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>{t('waselMap.radars_2')}</span>
            </button>
          </div>
        </div>
      )}

      {/* -- Bottom: GPS controls -- */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {isTracking && (
          <button
            onClick={centerOnMe}
            style={compactControlButtonStyle()}
            title={t('waselMap.center_on_my_location')}
          >
            <Navigation2 className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={isTracking ? stopTracking : startTracking}
          style={
            isTracking
              ? {
                  ...CONTROL_BUTTON_BASE,
                  minHeight: 44,
                  padding: '0 18px', borderRadius: 18,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: '0.86rem', fontWeight: typography.weight.extrabold,
                  color: colors.text.dark,
                  background: colors.primary.brand,
                  border: `1px solid ${colors.border.activeLight}`,
                  boxShadow: shadows.activeLg,
                }
              : {
                  ...CONTROL_BUTTON_BASE,
                  minHeight: 44,
                  padding: '0 18px', borderRadius: 18,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: '0.86rem', fontWeight: typography.weight.extrabold,
                  color: colors.text.light,
                  background: colors.background.panel,
                  border: `1px solid ${colors.border.primary}`,
                  boxShadow: shadows.md,
                }
          }
        >
          {isTracking ? (
            <>
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <Locate className="w-4 h-4" />
              <span>{t('waselMap.live_active')}</span>
            </>
          ) : (
            <>
              <Locate className="w-4 h-4" />
              <span>{t('waselMap.share_my_location')}</span>
            </>
          )}
        </button>
      </div>
    </>
  );
}

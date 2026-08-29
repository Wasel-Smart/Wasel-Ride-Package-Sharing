import { motion, AnimatePresence } from 'framer-motion';
import { X, Wifi, WifiOff } from 'lucide-react';
import { tx } from '../locales/tx';
import { colors, effects } from '../styles/design-tokens';

export function MapOverlays({
  isTracking,
  liveLocation,
  selectedPOI,
  locationError,
  onClosePOI,
  onCloseError,
}: {
  isTracking: boolean;
  liveLocation: { lat: number; lng: number; speed?: number | null; accuracy?: number | null } | null;
  selectedPOI: { type: string; name: string; vicinity?: string; info?: string } | null;
  locationError: string | null;
  onClosePOI: () => void;
  onCloseError: () => void;
}) {
  return (
    <>
      {/* -- Top-left: Live HUD -- */}
      <AnimatePresence>
        {isTracking && liveLocation && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute top-3 left-3 z-20 rounded-2xl border shadow-xl"
            style={{
              background: colors.background.panel,
              backdropFilter: effects.backdropFilter,
              borderColor: colors.border.active,
            }}
          >
            <div className="px-4 py-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: colors.primary.brandLight }} />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: colors.primary.brandLight }}>
                  {tx('waselMap.live')}
                </span>
                <Wifi className="w-3 h-3" style={{ color: colors.primary.brandLight }} />
              </div>
              {liveLocation.speed !== null && liveLocation.speed !== undefined && (
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-black leading-none" style={{ color: colors.text.light }}>
                    {Math.round((liveLocation.speed ?? 0) * 3.6)}
                  </span>
                  <span className="text-xs mb-0.5" style={{ color: colors.text.secondary }}>{tx('waselMap.km_h')}</span>
                </div>
              )}
              {liveLocation.accuracy !== null && liveLocation.accuracy !== undefined && (
                <p className="text-xs" style={{ color: colors.text.muted }}>
                  ±{Math.round(liveLocation.accuracy)}
                  {tx('waselMap.m_accuracy')}
                </p>
              )}
              <p className="text-xs font-mono" style={{ color: colors.text.muted }}>
                {liveLocation.lat.toFixed(5)}, {liveLocation.lng.toFixed(5)}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -- Center-top: Selected POI panel -- */}
      <AnimatePresence>
        {selectedPOI && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="absolute top-3 left-1/2 -translate-x-1/2 z-30 w-[300px] max-w-[calc(100%-80px)] rounded-2xl border shadow-2xl"
            style={{
              background: colors.background.panel,
              backdropFilter: effects.backdropFilterLg,
              borderColor: colors.border.active,
            }}
          >
            <div className="flex items-start gap-3 p-4">
              <span className="text-2xl mt-0.5 shrink-0">
                {selectedPOI.type === 'mosque'
                  ? '🕌'
                  : selectedPOI.type === 'radar'
                    ? '📸'
                    : selectedPOI.type === 'police'
                      ? '🚔'
                      : '⚠️'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-tight" style={{ color: colors.text.light }}>
                  {selectedPOI.name}
                </p>
                {selectedPOI.vicinity && (
                  <p className="text-xs mt-0.5 truncate" style={{ color: colors.text.secondary }}>
                    {selectedPOI.vicinity}
                  </p>
                )}
                {selectedPOI.info && (
                  <p className="text-xs mt-1 font-medium" style={{ color: colors.primary.brandLight }}>{selectedPOI.info}</p>
                )}
              </div>
              <button
                onClick={onClosePOI}
                className="shrink-0 p-1 rounded-lg transition-colors" style={{ color: colors.text.muted }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -- Location error -- */}
      <AnimatePresence>
        {locationError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-28 left-3 right-3 z-20 rounded-xl border border-red-500/30 px-4 py-2.5"
            style={{ background: 'rgba(127, 29, 29, 0.9)', backdropFilter: 'blur(8px)' }}
          >
            <div className="flex items-start gap-2">
              <WifiOff className="w-4 h-4 shrink-0 mt-0.5" style={{ color: colors.status.error }} />
              <p className="text-xs" style={{ color: colors.text.light }}>{locationError}</p>
              <button
                onClick={onCloseError}
                className="ml-auto shrink-0" style={{ color: colors.status.error }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

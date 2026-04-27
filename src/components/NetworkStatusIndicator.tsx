/**
 * Network Status Indicator Component
 * 
 * Displays real-time connection quality with visual indicators
 */

import { useEffect, useState } from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { getConnectionQualityMonitor, type ConnectionMetrics } from '../services/connectionQuality';
import { getOfflineQueueManager } from '../services/offlineQueue';
import { motion, AnimatePresence } from 'motion/react';

interface NetworkStatusIndicatorProps {
  compact?: boolean;
  showDetails?: boolean;
}

export function NetworkStatusIndicator({ compact = false, showDetails = false }: NetworkStatusIndicatorProps) {
  const [metrics, setMetrics] = useState<ConnectionMetrics | null>(null);
  const [queuedCount, setQueuedCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    const monitor = getConnectionQualityMonitor();
    const unsubscribe = monitor.subscribe(setMetrics);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const queue = getOfflineQueueManager();
    const unsubscribe = queue.subscribe(stats => {
      setQueuedCount(stats.totalQueued);
    });
    return unsubscribe;
  }, []);

  if (!metrics) return null;

  const qualityTone = {
    excellent: { dotClass: '', color: 'var(--ds-accent-strong)', surface: 'color-mix(in srgb, var(--ds-accent-strong) 10%, transparent)', border: 'color-mix(in srgb, var(--ds-accent-strong) 20%, transparent)' },
    good: { dotClass: '', color: 'var(--ds-accent)', surface: 'color-mix(in srgb, var(--ds-accent) 10%, transparent)', border: 'color-mix(in srgb, var(--ds-accent) 20%, transparent)' },
    fair: { dotClass: '', color: 'var(--wasel-brand-gradient-start)', surface: 'color-mix(in srgb, var(--wasel-brand-gradient-start) 10%, transparent)', border: 'color-mix(in srgb, var(--wasel-brand-gradient-start) 20%, transparent)' },
    poor: { dotClass: '', color: 'var(--wasel-brand-hover)', surface: 'color-mix(in srgb, var(--wasel-brand-hover) 10%, transparent)', border: 'color-mix(in srgb, var(--wasel-brand-hover) 20%, transparent)' },
    offline: { dotClass: '', color: 'var(--wasel-brand-hover)', surface: 'color-mix(in srgb, var(--wasel-brand-hover) 10%, transparent)', border: 'color-mix(in srgb, var(--wasel-brand-hover) 20%, transparent)' },
  } as const;

  const tone = qualityTone[metrics.quality];

  const getQualityText = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'Excellent Connection';
      case 'good': return 'Good Connection';
      case 'fair': return 'Fair Connection';
      case 'poor': return 'Poor Connection';
      case 'offline': return 'Offline';
      default: return 'Unknown';
    }
  };

  if (compact) {
    return (
      <motion.button
        onClick={() => setShowPanel(!showPanel)}
        className="p-2 rounded-full hover:bg-gray-800 transition-colors relative"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="w-3 h-3 rounded-full" style={{ background: tone?.color ?? 'var(--ds-text-soft)' }} />
        
        <AnimatePresence>
          {queuedCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-xs text-white flex items-center justify-center"
              style={{ background: 'var(--wasel-brand-gradient-start)' }}
            >
              {queuedCount}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showPanel && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute right-0 top-full mt-2 w-64 rounded-lg p-4 shadow-lg z-50"
              style={{
                background: 'color-mix(in srgb, var(--ds-page) 94%, transparent)',
                border: '1px solid color-mix(in srgb, var(--ds-accent) 18%, var(--ds-border))',
              }}
            >
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className="font-semibold" style={{ color: metrics.online ? tone.color : qualityTone.offline.color }}>
                    {metrics.online ? 'Online' : 'Offline'}
                  </span>
                </div>

                {metrics.online && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Quality:</span>
                      <span className="font-semibold">{getQualityText(metrics.quality)}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Latency:</span>
                      <span className="font-semibold">{metrics.latency}ms</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Bandwidth:</span>
                      <span className="font-semibold">{metrics.bandwidth.toFixed(1)} Mbps</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Packet Loss:</span>
                      <span className="font-semibold">{metrics.packetLoss.toFixed(1)}%</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Connection:</span>
                      <span className="font-semibold capitalize">{metrics.type}</span>
                    </div>
                  </>
                )}

                {queuedCount > 0 && (
                  <div className="flex items-center gap-2 rounded p-2 mt-2" style={{ background: 'color-mix(in srgb, var(--wasel-brand-gradient-start) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--wasel-brand-gradient-start) 20%, transparent)' }}>
                    <AlertCircle size={14} style={{ color: 'var(--wasel-brand-gradient-start)' }} />
                    <span className="text-xs" style={{ color: 'var(--wasel-brand-gradient-start)' }}>{queuedCount} requests queued</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    );
  }

  return (
      <motion.div
      className="flex items-center gap-2 px-3 py-2 rounded-lg border"
      style={{
        background: metrics.online ? tone.surface : qualityTone.offline.surface,
        borderColor: metrics.online ? tone.border : qualityTone.offline.border,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {metrics.online ? (
        <Wifi size={16} style={{ color: tone.color }} />
      ) : (
        <WifiOff size={16} style={{ color: qualityTone.offline.color }} />
      )}

      <div className="flex-1">
        <p className="text-xs font-semibold">{getQualityText(metrics.quality)}</p>
        {showDetails && metrics.online && (
          <p className="text-xs text-gray-400">{metrics.latency}ms • {metrics.bandwidth.toFixed(1)}Mbps</p>
        )}
      </div>

      {queuedCount > 0 && (
        <motion.div
          className="text-white rounded-full px-2 py-1 text-xs font-semibold"
          style={{ background: 'var(--wasel-brand-gradient-start)' }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {queuedCount}
        </motion.div>
      )}
    </motion.div>
  );
}

export default NetworkStatusIndicator;

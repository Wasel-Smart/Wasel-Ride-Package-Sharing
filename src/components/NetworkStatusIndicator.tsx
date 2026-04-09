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
    excellent: { dotClass: 'bg-green-500', color: '#22c55e', surface: 'rgba(34,197,94,0.10)', border: 'rgba(34,197,94,0.20)' },
    good: { dotClass: 'bg-blue-500', color: '#3b82f6', surface: 'rgba(59,130,246,0.10)', border: 'rgba(59,130,246,0.20)' },
    fair: { dotClass: 'bg-yellow-500', color: '#eab308', surface: 'rgba(234,179,8,0.10)', border: 'rgba(234,179,8,0.20)' },
    poor: { dotClass: 'bg-orange-500', color: '#f97316', surface: 'rgba(249,115,22,0.10)', border: 'rgba(249,115,22,0.20)' },
    offline: { dotClass: 'bg-red-500', color: '#ef4444', surface: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.20)' },
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
        <div className={`w-3 h-3 rounded-full ${tone?.dotClass ?? 'bg-gray-500'}`} />
        
        <AnimatePresence>
          {queuedCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full text-xs text-white flex items-center justify-center"
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
              className="absolute right-0 top-full mt-2 w-64 bg-gray-900 border border-cyan-500/20 rounded-lg p-4 shadow-lg z-50"
            >
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className={`font-semibold ${metrics.online ? 'text-green-400' : 'text-red-400'}`}>
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
                  <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded p-2 mt-2">
                    <AlertCircle size={14} className="text-yellow-500" />
                    <span className="text-yellow-500 text-xs">{queuedCount} requests queued</span>
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
        <WifiOff size={16} className="text-red-500" />
      )}

      <div className="flex-1">
        <p className="text-xs font-semibold">{getQualityText(metrics.quality)}</p>
        {showDetails && metrics.online && (
          <p className="text-xs text-gray-400">{metrics.latency}ms • {metrics.bandwidth.toFixed(1)}Mbps</p>
        )}
      </div>

      {queuedCount > 0 && (
        <motion.div
          className="bg-yellow-500 text-white rounded-full px-2 py-1 text-xs font-semibold"
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

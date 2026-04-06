/**
 * Network Status Indicator Component
 * 
 * Displays real-time connection quality with visual indicators
 */

import { useEffect, useState } from 'react';
import { Wifi, WifiOff, AlertCircle, Signal } from 'lucide-react';
import { getConnectionQualityMonitor, ConnectionMetrics } from '../services/connectionQuality';
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

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'bg-green-500';
      case 'good': return 'bg-blue-500';
      case 'fair': return 'bg-yellow-500';
      case 'poor': return 'bg-orange-500';
      case 'offline': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

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
        <div className={`w-3 h-3 rounded-full ${getQualityColor(metrics.quality)}`} />
        
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
      className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
        metrics.online
          ? `${getQualityColor(metrics.quality)}/10 border border-${getQualityColor(metrics.quality)}/20`
          : 'bg-red-500/10 border border-red-500/20'
      }`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {metrics.online ? (
        <Wifi size={16} className={`text-${getQualityColor(metrics.quality)}`} />
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

/**
 * Adaptive Loading — Network-aware Performance
 * 
 * Adapts resource loading based on:
 * - Network speed (4G, 3G, 2G, slow-2g)
 * - Data saver mode
 * - Device memory
 * - CPU cores
 */

export type NetworkSpeed = '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';
export type LoadingStrategy = 'high' | 'medium' | 'low';

export interface DeviceCapabilities {
  networkSpeed: NetworkSpeed;
  dataSaver: boolean;
  deviceMemory: number;
  cpuCores: number;
  strategy: LoadingStrategy;
}

class AdaptiveLoadingManager {
  getDeviceCapabilities(): DeviceCapabilities {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    const networkSpeed: NetworkSpeed = connection?.effectiveType || 'unknown';
    const dataSaver = connection?.saveData || false;
    const deviceMemory = (navigator as any).deviceMemory || 4;
    const cpuCores = navigator.hardwareConcurrency || 4;
    
    const strategy = this.determineStrategy(networkSpeed, dataSaver, deviceMemory, cpuCores);
    
    return {
      networkSpeed,
      dataSaver,
      deviceMemory,
      cpuCores,
      strategy,
    };
  }

  private determineStrategy(
    networkSpeed: NetworkSpeed,
    dataSaver: boolean,
    deviceMemory: number,
    cpuCores: number,
  ): LoadingStrategy {
    if (dataSaver) return 'low';
    
    if (networkSpeed === 'slow-2g' || networkSpeed === '2g') return 'low';
    if (networkSpeed === '3g' && deviceMemory < 4) return 'medium';
    if (networkSpeed === '4g' && deviceMemory >= 4 && cpuCores >= 4) return 'high';
    
    return 'medium';
  }

  shouldLoadHighQualityImages(): boolean {
    const { strategy } = this.getDeviceCapabilities();
    return strategy === 'high';
  }

  shouldPrefetchRoutes(): boolean {
    const { strategy, dataSaver } = this.getDeviceCapabilities();
    return !dataSaver && strategy !== 'low';
  }

  shouldLoadAnimations(): boolean {
    const { strategy } = this.getDeviceCapabilities();
    return strategy !== 'low';
  }

  getImageQuality(): 'high' | 'medium' | 'low' {
    const { strategy } = this.getDeviceCapabilities();
    return strategy;
  }

  getChunkLoadingConcurrency(): number {
    const { cpuCores, strategy } = this.getDeviceCapabilities();
    
    if (strategy === 'low') return 2;
    if (strategy === 'medium') return Math.min(cpuCores, 4);
    return Math.min(cpuCores, 6);
  }

  shouldUseServiceWorker(): boolean {
    const { strategy, dataSaver } = this.getDeviceCapabilities();
    return !dataSaver && strategy !== 'low';
  }

  getOptimalBundleSize(): number {
    const { strategy } = this.getDeviceCapabilities();
    
    if (strategy === 'low') return 100 * 1024; // 100KB
    if (strategy === 'medium') return 200 * 1024; // 200KB
    return 300 * 1024; // 300KB
  }

  logCapabilities(): void {
    const caps = this.getDeviceCapabilities();
    console.log('Device Capabilities:', {
      network: caps.networkSpeed,
      dataSaver: caps.dataSaver,
      memory: `${caps.deviceMemory}GB`,
      cores: caps.cpuCores,
      strategy: caps.strategy,
    });
  }
}

export const adaptiveLoading = new AdaptiveLoadingManager();

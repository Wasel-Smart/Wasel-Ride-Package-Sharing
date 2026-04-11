/**
 * LEVEL 1 & 2: INSTANT FEEDBACK & PSYCHOLOGICAL UX SMOOTHNESS
 * Sub-50ms feedback system with haptic and visual responses
 * OPTIMIZED: Minimal blocking to reduce FID
 */

type FeedbackType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

interface FeedbackOptions {
  haptic?: boolean;
  visual?: boolean;
  audio?: boolean;
  duration?: number;
}

type AudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

class InstantFeedbackEngine {
  private supportsHaptics: boolean = false;
  private audioContext: AudioContext | null = null;
  private initialized = false;

  constructor() {
    // DEFER INITIALIZATION to avoid blocking FID
    if (typeof window !== 'undefined') {
      // Use requestIdleCallback to initialize non-critical features
      requestIdleCallback(() => {
        this.lazyInit();
      }, { timeout: 2000 });
    }
  }

  /**
   * Lazy initialization to avoid blocking main thread
   */
  private lazyInit(): void {
    if (this.initialized) return;
    
    // Check for haptic feedback support
    this.supportsHaptics = 'vibrate' in navigator;
    
    // Initialize audio context for audio feedback (deferred)
    const audioWindow = window as AudioWindow;
    if ('AudioContext' in window || 'webkitAudioContext' in audioWindow) {
      try {
        const AudioContextCtor = window.AudioContext ?? audioWindow.webkitAudioContext;
        this.audioContext = AudioContextCtor ? new AudioContextCtor() : null;
      } catch {
        // Ignore - audio not critical
      }
    }
    
    this.initialized = true;
  }

  /**
   * Provide instant haptic feedback
   * Target: <10ms response time
   * OPTIMIZED: Non-blocking
   */
  haptic(type: FeedbackType = 'light'): void {
    if (!this.supportsHaptics) return;

    const patterns: Record<FeedbackType, number | number[]> = {
      light: 10,
      medium: 20,
      heavy: 30,
      success: [10, 50, 10],
      warning: [20, 100, 20],
      error: [30, 100, 30, 100, 30]
    };

    const pattern = patterns[type];
    
    // Use try-catch to prevent any blocking
    try {
      if (Array.isArray(pattern)) {
        navigator.vibrate(pattern);
      } else {
        navigator.vibrate(pattern);
      }
    } catch {
      // Ignore vibration errors silently
    }
  }

  /**
   * Provide instant visual feedback with ripple effect
   * Target: <16ms (1 frame at 60fps)
   * OPTIMIZED: Uses transform and will-change for GPU acceleration
   */
  ripple(element: HTMLElement, options: { x: number; y: number; color?: string } = { x: 0, y: 0 }): void {
    // Skip if element doesn't exist
    if (!element) return;
    
    // Use requestAnimationFrame to avoid blocking
    requestAnimationFrame(() => {
      // Use CSS animations for performance
      const ripple = document.createElement('span');
      const rect = element.getBoundingClientRect();
      
      const size = Math.max(rect.width, rect.height);
      const x = options.x - rect.left - size / 2;
      const y = options.y - rect.top - size / 2;
      
      ripple.style.cssText = `
        position: absolute;
        border-radius: 50%;
        background-color: ${options.color || 'rgba(255, 255, 255, 0.5)'};
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        pointer-events: none;
        transform: scale(0);
        will-change: transform, opacity;
        animation: ripple-animation 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      `;
      
      element.appendChild(ripple);
      
      // Remove ripple after animation (using setTimeout to avoid blocking)
      setTimeout(() => {
        if (ripple.parentNode) {
          ripple.parentNode.removeChild(ripple);
        }
      }, 600);
    });
  }

  /**
   * Provide instant scale feedback
   * Target: <16ms
   * OPTIMIZED: Uses transform and will-change for GPU acceleration
   */
  scalePress(element: HTMLElement, scale: number = 0.95): void {
    element.style.transition = 'transform 0.1s cubic-bezier(0.4, 0, 0.2, 1)';
    element.style.transform = `scale(${scale})`;
    element.style.willChange = 'transform';
    
    // Reset after brief moment
    setTimeout(() => {
      element.style.transform = 'scale(1)';
      setTimeout(() => {
        element.style.willChange = 'auto';
      }, 100);
    }, 100);
  }

  /**
   * Provide instant audio feedback
   * Target: <20ms
   * OPTIMIZED: Non-blocking
   */
  playTone(frequency: number = 440, duration: number = 50, type: OscillatorType = 'sine'): void {
    if (!this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = type;
      
      gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration / 1000);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration / 1000);
    } catch {
      // Ignore audio errors silently
    }
  }

  /**
   * Combined instant feedback (haptic + visual + audio)
   * Target: <50ms total
   * OPTIMIZED: Non-blocking
   */
  instant(element: HTMLElement, type: FeedbackType = 'light', options: FeedbackOptions = {}): void {
    const {
      haptic = true,
      visual = true,
      audio = false,
    } = options;

    // All feedback runs in parallel for <50ms total time
    
    // Haptic (<10ms)
    if (haptic) {
      this.haptic(type);
    }

    // Visual (<16ms)
    if (visual) {
      this.scalePress(element);
    }

    // Audio (<20ms, optional)
    if (audio) {
      const frequencies: Record<FeedbackType, number> = {
        light: 440,
        medium: 523,
        heavy: 659,
        success: 523,
        warning: 440,
        error: 330
      };
      this.playTone(frequencies[type], 30);
    }
  }

  /**
   * Touch-optimized event handler
   * Provides instant feedback on touch
   */
  attachTouchFeedback(element: HTMLElement, type: FeedbackType = 'light', options: FeedbackOptions = {}): () => void {
    const handleTouchStart = (e: TouchEvent) => {
      // Provide immediate feedback
      const touch = e.touches[0];
      if (options.haptic !== false) {
        this.haptic(type);
      }
      if (options.audio) {
        this.playTone(440, 30);
      }
      this.ripple(element, { x: touch.clientX, y: touch.clientY });
    };

    const handleTouchEnd = () => {
      // Reset visual state
      element.style.transform = 'scale(1)';
    };

    // Use passive event listeners for better scrolling performance
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    // Return cleanup function
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
    };
  }

  /**
   * Mouse-optimized event handler
   * Provides instant feedback on click
   */
  attachClickFeedback(element: HTMLElement, type: FeedbackType = 'light', options: FeedbackOptions = {}): () => void {
    const handleMouseDown = (e: MouseEvent) => {
      if (options.haptic !== false) {
        this.haptic(type);
      }
      if (options.audio) {
        this.playTone(440, 30);
      }
      this.ripple(element, { x: e.clientX, y: e.clientY });
      this.scalePress(element);
    };

    const handleMouseUp = () => {
      element.style.transform = 'scale(1)';
    };

    element.addEventListener('mousedown', handleMouseDown);
    element.addEventListener('mouseup', handleMouseUp);
    element.addEventListener('mouseleave', handleMouseUp);

    return () => {
      element.removeEventListener('mousedown', handleMouseDown);
      element.removeEventListener('mouseup', handleMouseUp);
      element.removeEventListener('mouseleave', handleMouseUp);
    };
  }
}

// Export singleton instance
export const instantFeedback = new InstantFeedbackEngine();

/**
 * React hook for instant feedback
 */
import { useEffect, useRef } from 'react';
import { omitUndefined } from './object';

export function useInstantFeedback(type: FeedbackType = 'light', options: FeedbackOptions = {}) {
  const elementRef = useRef<HTMLElement>(null);
  const { audio, duration, haptic, visual } = options;

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    const effectOptions = omitUndefined({ audio, duration, haptic, visual });

    // Attach both touch and click feedback
    const cleanupTouch = instantFeedback.attachTouchFeedback(element, type, effectOptions);
    const cleanupClick = instantFeedback.attachClickFeedback(element, type, effectOptions);

    return () => {
      cleanupTouch();
      cleanupClick();
    };
  }, [audio, duration, haptic, type, visual]);

  return elementRef;
}

// Add CSS animation for ripple effect
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes ripple-animation {
      to {
        transform: scale(2.5);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(styleSheet);
}

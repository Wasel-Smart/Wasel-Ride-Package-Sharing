/**
 * Advanced Micro-Interaction System
 * Implements haptic feedback, intelligent animations, and cognitive load optimization
 */

import { motion, useAnimation, useInView, AnimatePresence } from 'framer-motion';
import { useRef, useEffect, useState, useCallback } from 'react';

type InViewMargin =
  | `${number}px`
  | `${number}%`
  | `${number}px ${number}px`
  | `${number}% ${number}%`
  | `${number}px ${number}px ${number}px`
  | `${number}% ${number}% ${number}%`
  | `${number}px ${number}px ${number}px ${number}px`
  | `${number}% ${number}% ${number}% ${number}%`;

// Haptic feedback system for mobile devices
export const useHapticFeedback = () => {
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30],
        success: [10, 50, 10],
        warning: [20, 100, 20],
        error: [50, 100, 50, 100, 50],
      };
      navigator.vibrate(patterns[type]);
    }
  }, []);

  return { triggerHaptic };
};

// Intelligent loading states with skeleton optimization
export const useSmartLoading = (isLoading: boolean, minDuration = 300) => {
  const [showLoading, setShowLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isLoading && !hasLoaded) {
      setShowLoading(true);
    } else if (!isLoading && showLoading) {
      timer = setTimeout(() => {
        setShowLoading(false);
        setHasLoaded(true);
      }, minDuration);
    }

    return () => clearTimeout(timer);
  }, [isLoading, showLoading, hasLoaded, minDuration]);

  return showLoading;
};

// Advanced intersection observer with performance optimization
export const useAdvancedInView = (threshold = 0.1, rootMargin: InViewMargin = '50px') => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { 
    amount: threshold,
    margin: rootMargin,
    once: true // Only trigger once for performance
  });

  return { ref, isInView };
};

// Stagger animation system for lists
export const createStaggerAnimation = (delay = 0.1) => ({
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * delay,
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
});

// Morphing button component with state transitions
interface MorphingButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  state: 'idle' | 'loading' | 'success' | 'error';
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
}

export const MorphingButton: React.FC<MorphingButtonProps> = ({
  children,
  onClick,
  state,
  size = 'md',
  variant = 'primary',
  className = '',
}) => {
  const { triggerHaptic } = useHapticFeedback();
  const controls = useAnimation();

  const sizeClasses = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-11 px-6 text-base',
    lg: 'h-14 px-8 text-lg',
  };

  const variantClasses = {
    primary: 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-500/25',
    secondary: 'bg-white border border-neutral-200 text-neutral-900 shadow-sm',
    ghost: 'bg-transparent text-neutral-600 hover:bg-neutral-50',
  };

  const handleClick = useCallback(() => {
    triggerHaptic('light');
    controls.start({
      scale: [1, 0.95, 1],
      transition: { duration: 0.15 }
    });
    onClick();
  }, [onClick, triggerHaptic, controls]);

  useEffect(() => {
    if (state === 'success') {
      triggerHaptic('success');
    } else if (state === 'error') {
      triggerHaptic('error');
    }
  }, [state, triggerHaptic]);

  return (
    <motion.button
      animate={controls}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      disabled={state === 'loading'}
      className={`
        relative overflow-hidden rounded-xl font-semibold transition-all duration-200
        ${sizeClasses[size]} ${variantClasses[variant]} ${className}
        disabled:opacity-70 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2
      `}
    >
      <AnimatePresence mode="wait">
        {state === 'loading' ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-5 h-5 border-2 border-current border-t-transparent rounded-full"
            />
          </motion.div>
        ) : state === 'success' ? (
          <motion.div
            key="success"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="flex items-center justify-center"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </motion.div>
        ) : state === 'error' ? (
          <motion.div
            key="error"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="flex items-center justify-center text-red-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </motion.div>
        ) : (
          <motion.span
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

// Smart card component with hover states and micro-interactions
interface SmartCardProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  hoverable?: boolean;
  pressable?: boolean;
}

export const SmartCard: React.FC<SmartCardProps> = ({
  children,
  onClick,
  className = '',
  hoverable = true,
  pressable = true,
}) => {
  const { triggerHaptic } = useHapticFeedback();
  const { ref, isInView } = useAdvancedInView();

  const handleClick = useCallback(() => {
    if (onClick) {
      triggerHaptic('light');
      onClick();
    }
  }, [onClick, triggerHaptic]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={hoverable ? { 
        y: -4, 
        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' 
      } : undefined}
      whileTap={pressable ? { scale: 0.98 } : undefined}
      onClick={handleClick}
      className={`
        bg-white rounded-2xl border border-neutral-200 p-6 cursor-pointer
        transition-all duration-200 shadow-sm hover:shadow-md
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
};

// Progressive disclosure component
interface ProgressiveDisclosureProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export const ProgressiveDisclosure: React.FC<ProgressiveDisclosureProps> = ({
  trigger,
  children,
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { triggerHaptic } = useHapticFeedback();

  const toggleOpen = useCallback(() => {
    triggerHaptic('light');
    setIsOpen(!isOpen);
  }, [isOpen, triggerHaptic]);

  return (
    <div>
      <motion.div
        onClick={toggleOpen}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="cursor-pointer"
      >
        {trigger}
      </motion.div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            <motion.div
              initial={{ y: -10 }}
              animate={{ y: 0 }}
              exit={{ y: -10 }}
              transition={{ duration: 0.2, delay: 0.1 }}
            >
              {children}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Skeleton loader with shimmer effect
export const SkeletonLoader: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-neutral-200 rounded ${className}`}>
    <div className="shimmer-effect h-full w-full rounded bg-gradient-to-r from-transparent via-white to-transparent opacity-50" />
  </div>
);

// Toast notification system
export const useToast = () => {
  const [toasts, setToasts] = useState<Array<{
    id: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  }>>([]);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 5000);
  }, []);

  return { toasts, addToast };
};

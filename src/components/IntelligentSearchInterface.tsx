/**
 * Intelligent Search Interface with AI-Powered UX
 * Features: Voice search, predictive routing, smart suggestions, real-time validation
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Mic,
  MicOff,
  MapPin,
  Calendar,
  Clock,
  Zap,
  Brain,
  TrendingUp,
  Star,
  ArrowRight,
} from 'lucide-react';
import { MorphingButton, useHapticFeedback, useAdvancedInView } from '../components/advanced-interactions';
import { NEURAL_COLORS, SPACING, TYPOGRAPHY, SHADOWS, RADIUS } from '../styles/advanced-design-tokens';
import { CITIES } from '../pages/waselCoreRideData';

interface SmartSearchProps {
  from: string;
  to: string;
  date: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onSearch: () => void;
  loading: boolean;
  suggestions?: Array<{
    from: string;
    to: string;
    popularity: number;
    avgPrice: number;
    avgDuration: string;
  }>;
}

// Voice recognition hook
const useVoiceSearch = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const result = event.results[0][0].transcript;
        setTranscript(result);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  return { isListening, transcript, startListening, stopListening };
};

export function IntelligentSearchInterface({
  from,
  to,
  date,
  onFromChange,
  onToChange,
  onDateChange,
  onSearch,
  loading,
  suggestions = [],
}: SmartSearchProps) {
  const { triggerHaptic } = useHapticFeedback();
  const { ref, isInView } = useAdvancedInView();
  const { isListening, transcript, startListening, stopListening } = useVoiceSearch();
  
  const [activeField, setActiveField] = useState<'from' | 'to' | null>(null);

  // Handle voice search results
  useEffect(() => {
    if (transcript) {
      const words = transcript.toLowerCase().split(' ');
      const fromIndex = words.findIndex(word => word.includes('from'));
      const toIndex = words.findIndex(word => word.includes('to'));
      
      if (fromIndex !== -1 && fromIndex + 1 < words.length) {
        const fromCity = CITIES.find(city => 
          city.toLowerCase().includes(words[fromIndex + 1])
        );
        if (fromCity) onFromChange(fromCity);
      }
      
      if (toIndex !== -1 && toIndex + 1 < words.length) {
        const toCity = CITIES.find(city => 
          city.toLowerCase().includes(words[toIndex + 1])
        );
        if (toCity) onToChange(toCity);
      }
    }
  }, [transcript, onFromChange, onToChange]);

  const handleVoiceToggle = () => {
    triggerHaptic('medium');
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleSwapCities = () => {
    triggerHaptic('medium');
    const tempFrom = from;
    onFromChange(to);
    onToChange(tempFrom);
  };

  const handleQuickSearch = (suggestion: typeof suggestions[0]) => {
    triggerHaptic('light');
    onFromChange(suggestion.from);
    onToChange(suggestion.to);
    setTimeout(() => onSearch(), 100);
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        borderRadius: RADIUS['3xl'],
        padding: SPACING[8],
        border: `2px solid ${NEURAL_COLORS.neutral[200]}`,
        boxShadow: SHADOWS['2xl'],
        position: 'relative',
        overflow: 'visible',
      }}
    >
      {/* AI-Powered Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: SPACING[3],
          marginBottom: SPACING[6],
        }}
      >
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          style={{
            width: 40,
            height: 40,
            borderRadius: RADIUS.xl,
            background: `linear-gradient(135deg, ${NEURAL_COLORS.primary[500]}, ${NEURAL_COLORS.primary[700]})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: SHADOWS.primary,
          }}
        >
          <Brain size={20} color="#ffffff" />
        </motion.div>
        <div>
          <h2 style={{
            fontSize: TYPOGRAPHY.fontSize['2xl'][0],
            fontWeight: TYPOGRAPHY.fontWeight.black,
            color: NEURAL_COLORS.neutral[900],
            margin: 0,
            fontFamily: TYPOGRAPHY.fontFamily.display.join(', '),
          }}>
            AI-Powered Search
          </h2>
          <p style={{
            fontSize: TYPOGRAPHY.fontSize.sm[0],
            color: NEURAL_COLORS.neutral[600],
            margin: 0,
            fontWeight: TYPOGRAPHY.fontWeight.medium,
          }}>
            Voice search, smart suggestions, instant results
          </p>
        </div>
      </motion.div>

      {/* Main Search Form */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr 200px',
        gap: SPACING[4],
        alignItems: 'end',
        marginBottom: SPACING[6],
      }}>
        {/* From Field */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          style={{ position: 'relative' }}
        >
          <label style={{
            display: 'block',
            fontSize: TYPOGRAPHY.fontSize.sm[0],
            fontWeight: TYPOGRAPHY.fontWeight.semibold,
            color: NEURAL_COLORS.neutral[700],
            marginBottom: SPACING[2],
            fontFamily: TYPOGRAPHY.fontFamily.sans.join(', '),
          }}>
            From
          </label>
          <motion.div
            whileFocus={{ scale: 1.02, boxShadow: SHADOWS.primary }}
            style={{
              position: 'relative',
              background: NEURAL_COLORS.neutral[50],
              borderRadius: RADIUS.xl,
              border: `2px solid ${activeField === 'from' ? NEURAL_COLORS.primary[500] : NEURAL_COLORS.neutral[200]}`,
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: SPACING[3],
              padding: SPACING[4],
              height: 56,
            }}>
              <MapPin size={20} color={NEURAL_COLORS.success.base} />
              <select
                value={from}
                onChange={(e) => {
                  triggerHaptic('light');
                  onFromChange(e.target.value);
                }}
                onFocus={() => setActiveField('from')}
                onBlur={() => setActiveField(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  flex: 1,
                  fontSize: TYPOGRAPHY.fontSize.base[0],
                  fontWeight: TYPOGRAPHY.fontWeight.medium,
                  color: NEURAL_COLORS.neutral[900],
                  fontFamily: TYPOGRAPHY.fontFamily.sans.join(', '),
                  cursor: 'pointer',
                }}
              >
                {CITIES.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
          </motion.div>
        </motion.div>

        {/* Swap Button */}
        <motion.button
          whileHover={{ scale: 1.1, rotate: 180 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleSwapCities}
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${NEURAL_COLORS.primary[500]}, ${NEURAL_COLORS.primary[600]})`,
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: SHADOWS.primary,
            marginBottom: SPACING[1],
          }}
        >
          <ArrowRight size={20} color="#ffffff" />
        </motion.button>

        {/* To Field */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          style={{ position: 'relative' }}
        >
          <label style={{
            display: 'block',
            fontSize: TYPOGRAPHY.fontSize.sm[0],
            fontWeight: TYPOGRAPHY.fontWeight.semibold,
            color: NEURAL_COLORS.neutral[700],
            marginBottom: SPACING[2],
            fontFamily: TYPOGRAPHY.fontFamily.sans.join(', '),
          }}>
            To
          </label>
          <motion.div
            whileFocus={{ scale: 1.02, boxShadow: SHADOWS.primary }}
            style={{
              position: 'relative',
              background: NEURAL_COLORS.neutral[50],
              borderRadius: RADIUS.xl,
              border: `2px solid ${activeField === 'to' ? NEURAL_COLORS.primary[500] : NEURAL_COLORS.neutral[200]}`,
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: SPACING[3],
              padding: SPACING[4],
              height: 56,
            }}>
              <MapPin size={20} color={NEURAL_COLORS.primary[500]} />
              <select
                value={to}
                onChange={(e) => {
                  triggerHaptic('light');
                  onToChange(e.target.value);
                }}
                onFocus={() => setActiveField('to')}
                onBlur={() => setActiveField(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  flex: 1,
                  fontSize: TYPOGRAPHY.fontSize.base[0],
                  fontWeight: TYPOGRAPHY.fontWeight.medium,
                  color: NEURAL_COLORS.neutral[900],
                  fontFamily: TYPOGRAPHY.fontFamily.sans.join(', '),
                  cursor: 'pointer',
                }}
              >
                {CITIES.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
          </motion.div>
        </motion.div>

        {/* Date Field */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <label style={{
            display: 'block',
            fontSize: TYPOGRAPHY.fontSize.sm[0],
            fontWeight: TYPOGRAPHY.fontWeight.semibold,
            color: NEURAL_COLORS.neutral[700],
            marginBottom: SPACING[2],
            fontFamily: TYPOGRAPHY.fontFamily.sans.join(', '),
          }}>
            Date
          </label>
          <motion.div
            whileFocus={{ scale: 1.02, boxShadow: SHADOWS.primary }}
            style={{
              background: NEURAL_COLORS.neutral[50],
              borderRadius: RADIUS.xl,
              border: `2px solid ${NEURAL_COLORS.neutral[200]}`,
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: SPACING[3],
              padding: SPACING[4],
              height: 56,
            }}>
              <Calendar size={20} color={NEURAL_COLORS.warning.base} />
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  triggerHaptic('light');
                  onDateChange(e.target.value);
                }}
                min={new Date().toISOString().split('T')[0]}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  flex: 1,
                  fontSize: TYPOGRAPHY.fontSize.base[0],
                  fontWeight: TYPOGRAPHY.fontWeight.medium,
                  color: NEURAL_COLORS.neutral[900],
                  fontFamily: TYPOGRAPHY.fontFamily.sans.join(', '),
                  cursor: 'pointer',
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Voice Search & Main Search Button */}
      <div style={{
        display: 'flex',
        gap: SPACING[4],
        alignItems: 'center',
        marginBottom: SPACING[6],
      }}>
        {/* Voice Search Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleVoiceToggle}
          style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: isListening 
              ? `linear-gradient(135deg, ${NEURAL_COLORS.danger.base}, ${NEURAL_COLORS.danger.dark})`
              : `linear-gradient(135deg, ${NEURAL_COLORS.neutral[600]}, ${NEURAL_COLORS.neutral[700]})`,
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: isListening ? SHADOWS.danger : SHADOWS.base,
            transition: 'all 0.3s ease',
          }}
        >
          <AnimatePresence mode="wait">
            {isListening ? (
              <motion.div
                key="listening"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <MicOff size={24} color="#ffffff" />
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Mic size={24} color="#ffffff" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Main Search Button */}
        <MorphingButton
          onClick={onSearch}
          state={loading ? 'loading' : 'idle'}
          size="lg"
          className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 shadow-2xl shadow-teal-500/30"
        >
          <Search size={24} className="mr-3" />
          {loading ? 'Finding Perfect Rides...' : 'Search Intelligent Rides'}
        </MorphingButton>
      </div>

      {/* Popular Routes Suggestions */}
      {suggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: SPACING[2],
            marginBottom: SPACING[4],
          }}>
            <TrendingUp size={16} color={NEURAL_COLORS.primary[500]} />
            <span style={{
              fontSize: TYPOGRAPHY.fontSize.sm[0],
              fontWeight: TYPOGRAPHY.fontWeight.semibold,
              color: NEURAL_COLORS.neutral[700],
            }}>
              Popular routes right now
            </span>
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: SPACING[3],
          }}>
            {suggestions.slice(0, 3).map((suggestion, index) => (
              <motion.button
                key={`${suggestion.from}-${suggestion.to}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 + index * 0.1, duration: 0.4 }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleQuickSearch(suggestion)}
                style={{
                  background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.05), rgba(16, 185, 129, 0.05))',
                  border: `1px solid ${NEURAL_COLORS.primary[200]}`,
                  borderRadius: RADIUS.xl,
                  padding: SPACING[4],
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: SPACING[2],
                }}>
                  <div style={{
                    fontSize: TYPOGRAPHY.fontSize.base[0],
                    fontWeight: TYPOGRAPHY.fontWeight.bold,
                    color: NEURAL_COLORS.neutral[900],
                  }}>
                    {suggestion.from} → {suggestion.to}
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: SPACING[1],
                  }}>
                    <Star size={12} fill={NEURAL_COLORS.warning.base} color={NEURAL_COLORS.warning.base} />
                    <span style={{
                      fontSize: TYPOGRAPHY.fontSize.xs[0],
                      fontWeight: TYPOGRAPHY.fontWeight.semibold,
                      color: NEURAL_COLORS.warning.base,
                    }}>
                      {suggestion.popularity}
                    </span>
                  </div>
                </div>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: SPACING[4],
                  fontSize: TYPOGRAPHY.fontSize.sm[0],
                  color: NEURAL_COLORS.neutral[600],
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: SPACING[1] }}>
                    <Clock size={12} />
                    {suggestion.avgDuration}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: SPACING[1] }}>
                    <Zap size={12} />
                    {suggestion.avgPrice} JOD
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Voice Search Feedback */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(0, 0, 0, 0.8)',
              borderRadius: RADIUS['2xl'],
              padding: SPACING[6],
              color: '#ffffff',
              textAlign: 'center',
              backdropFilter: 'blur(10px)',
              zIndex: 1000,
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              style={{ marginBottom: SPACING[3] }}
            >
              <Mic size={32} color="#ffffff" />
            </motion.div>
            <div style={{
              fontSize: TYPOGRAPHY.fontSize.lg[0],
              fontWeight: TYPOGRAPHY.fontWeight.bold,
              marginBottom: SPACING[2],
            }}>
              Listening...
            </div>
            <div style={{
              fontSize: TYPOGRAPHY.fontSize.sm[0],
              color: 'rgba(255, 255, 255, 0.8)',
            }}>
              Say "from Amman to Aqaba"
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

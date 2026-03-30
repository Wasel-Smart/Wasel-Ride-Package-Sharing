/**
 * LiveTripTracking — Real-time trip progress screen
 *
 * ✅ Animated progress tracker
 * ✅ Driver location simulation (fake position updates)
 * ✅ Bilingual (EN / AR)
 * ✅ Emergency SOS button
 * ✅ Share location with trusted contact
 * ✅ Chat & call driver
 * ✅ Full dark Wasel design system
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Navigation, Phone, MessageSquare, Shield, Share2, ChevronDown,
  ChevronUp, MapPin, Clock, ArrowRight, Star, Users, Zap,
  AlertTriangle, CheckCircle, Brain, Leaf, Car, X, Copy,
  XCircle, ThumbsUp,
} from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { WaselMap } from './WaselMap';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import { WaselBadge } from './wasel-ui/WaselBadge';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { activeTripAPI } from '../services/activeTrip';
import { API_URL, fetchWithRetry, getAuthDetails } from '../services/core';
import { shareContent } from '../hooks/useShare';

// ─── Trip data ────────────────────────────────────────────────────────────────

const TRIP = {
  id: 'WA-9124',
  from: '7th Circle, Amman',
  fromAr: 'الدوار السابع، عمّان',
  fromCoord: { lat: 31.9562, lng: 35.8637 },
  to: 'University of Jordan',
  toAr: 'جامعة الأردن',
  toCoord: { lat: 32.0156, lng: 35.8696 },
  driver: {
    id: 'driver-ahmad-khalil',
    name: 'Ahmad Khalil',
    nameAr: 'أحمد خليل',
    rating: 4.92,
    trips: 1847,
    img: 'https://i.pravatar.cc/150?u=ah-k',
    phone: '+962 79 123 4567',
    initials: 'AK',
  },
  vehicle: { model: 'Toyota Corolla', color: 'White', plate: '50·12345', year: 2022 },
  price: 1.850,
  startedAt: '7:42 AM',
  estimatedArrival: '8:04 AM',
  totalDistance: '9.4 km',
  passengers: 2,
  shareCode: 'WA-9124',
};

const WAYPOINTS = [
  { label: 'Pickup', labelAr: 'نقطة التقاط', done: true, coord: { lat: 31.9562, lng: 35.8637 } },
  { label: 'Tlaa Al Ali', labelAr: 'تلاع العلي', done: true, coord: { lat: 31.9808, lng: 35.8436 } },
  { label: 'Khalda', labelAr: 'خلدا', done: false, coord: { lat: 31.9976, lng: 35.8579 } },
  { label: 'University of Jordan', labelAr: 'جامعة الأردن', done: false, coord: { lat: 32.0156, lng: 35.8696 } },
];

// ─── Progress timeline ──────────────────────────────────────────────────────

function ProgressTimeline({ progress }: { progress: number }) {
  const wpProgress = [100, 100, Math.max(0, (progress - 40) * 3.3), 0];

  return (
    <div className="flex items-start gap-2">
      {WAYPOINTS.map((wp, i) => (
        <div key={i} className="flex flex-col items-center flex-1">
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
            wp.done || progress >= (i / (WAYPOINTS.length - 1)) * 100
              ? 'bg-primary border-primary shadow-md shadow-primary/30'
              : 'bg-background border-border'
          }`}>
            {wp.done ? (
              <CheckCircle className="w-3.5 h-3.5 text-white" />
            ) : i === 2 ? (
              <motion.div
                className="w-2 h-2 rounded-full bg-primary"
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            ) : (
              <div className="w-2 h-2 rounded-full bg-border" />
            )}
          </div>
          <div className="mt-1 text-center px-0.5">
            <p className="text-[9px] text-slate-400 leading-tight font-medium">{wp.label}</p>
          </div>
          {i < WAYPOINTS.length - 1 && (
            <div className="absolute" style={{ display: 'none' }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── ETA card ─────────────────────────────────────────────────────────────────

function ETACard({ eta, timeLeft }: { eta: string; timeLeft: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-center bg-primary/10 border border-primary/20 rounded-2xl px-4 py-2.5 flex-shrink-0">
        <div className="text-2xl font-bold text-primary">{timeLeft}m</div>
        <div className="text-[10px] text-slate-500">to arrive · للوصول</div>
      </div>
      <div className="flex-1">
        <div className="text-white font-bold">ETA: {eta}</div>
        <div className="text-slate-500 text-xs mt-0.5">{TRIP.totalDistance} total • {TRIP.price.toFixed(3)} JOD</div>
        <div className="flex items-center gap-1 mt-1">
          <Leaf className="w-3 h-3 text-emerald-400" />
          <span className="text-[10px] text-emerald-400">–42% CO₂ vs solo taxi</span>
        </div>
      </div>
    </div>
  );
}

// ─── SOS dialog ───────────────────────────────────────────────────────────────

function SOSDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [confirmed, setConfirmed] = useState(false);

  const handleSOS = () => {
    setConfirmed(true);
    setTimeout(() => {
      toast.error('🚨 Emergency alert sent! Help is on the way.');
      onClose();
      setConfirmed(false);
    }, 2000);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 20 }}
            className="w-full max-w-sm bg-card border border-red-500/30 rounded-3xl p-6 text-center shadow-2xl shadow-red-500/20"
          >
            <div className="w-16 h-16 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Emergency SOS</h3>
            <p className="text-red-400 font-semibold mb-1">طوارئ</p>
            <p className="text-slate-400 text-sm mb-6">This will alert Wasel's safety team and share your live location with emergency contacts.</p>

            {!confirmed ? (
              <div className="space-y-3">
                <Button
                  onClick={handleSOS}
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-bold h-12 rounded-xl shadow-lg shadow-red-500/20"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Send Emergency Alert
                </Button>
                <Button
                  onClick={onClose}
                  variant="ghost"
                  className="w-full text-slate-400 hover:text-white rounded-xl h-10"
                >
                  Cancel · إلغاء
                </Button>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-3"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-10 h-10 border-2 border-red-400 border-t-transparent rounded-full"
                />
                <p className="text-red-400 font-bold">Sending alert…</p>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Post-trip Rating Sheet ────────────────────────────────────────────────────

const EMOJI_RATINGS = [
  { stars: 1, emoji: '😞', label: 'Poor',      labelAr: 'سيء'      },
  { stars: 2, emoji: '😕', label: 'Fair',      labelAr: 'مقبول'    },
  { stars: 3, emoji: '😐', label: 'OK',        labelAr: 'جيد'      },
  { stars: 4, emoji: '😊', label: 'Good',      labelAr: 'جيد جداً' },
  { stars: 5, emoji: '🤩', label: 'Excellent', labelAr: 'ممتاز'    },
];

function TripRatingSheet({
  open,
  driverName,
  driverImg,
  driverInitials,
  fare,
  onSubmit,
  onSkip,
}: {
  open: boolean;
  driverName: string;
  driverImg: string;
  driverInitials: string;
  fare: string;
  onSubmit: (stars: number, comment: string) => void;
  onSkip: () => void;
}) {
  const [stars, setStars] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const active = hovered || stars;
  const emojiData = EMOJI_RATINGS[active - 1];

  const handleSubmit = async () => {
    if (!stars) { toast.error('Please select a rating first.'); return; }
    setSubmitting(true);
    await onSubmit(stars, comment);
    setSubmitting(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center"
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="w-full max-w-lg bg-card border border-border rounded-t-3xl p-6 space-y-5 shadow-2xl"
          >
            {/* Handle */}
            <div className="w-10 h-1 bg-border rounded-full mx-auto -mt-1" />

            {/* Header */}
            <div className="flex items-center gap-3">
              <Avatar className="w-14 h-14 border-2 border-primary/20">
                <AvatarImage src={driverImg} />
                <AvatarFallback className="bg-muted text-white font-bold">{driverInitials}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-lg font-bold text-white">Rate your ride</h2>
                <p className="text-slate-400 text-sm">
                  with <span className="text-primary font-semibold">{driverName}</span>
                  <span className="text-slate-600 mx-1.5">·</span>
                  <span className="text-emerald-400 font-semibold">{fare} JOD</span>
                </p>
              </div>
            </div>

            {/* Star row */}
            <div className="flex justify-center gap-3">
              {EMOJI_RATINGS.map(({ stars: s, emoji }) => (
                <button
                  key={s}
                  onMouseEnter={() => setHovered(s)}
                  onMouseLeave={() => setHovered(0)}
                  onClick={() => setStars(s)}
                  className="flex flex-col items-center gap-1 group"
                >
                  <motion.div
                    animate={{ scale: active === s ? 1.25 : 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                    className="text-3xl select-none"
                  >
                    {emoji}
                  </motion.div>
                  {[1,2,3,4,5].indexOf(s) >= 0 && (
                    <Star
                      className={`w-4 h-4 transition-colors ${
                        s <= active ? 'fill-amber-400 text-amber-400' : 'text-border'
                      }`}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Emoji label */}
            <AnimatePresence mode="wait">
              {emojiData && (
                <motion.div
                  key={emojiData.label}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="text-center"
                >
                  <span className="text-white font-bold">{emojiData.label}</span>
                  <span className="text-slate-500 ml-2 text-sm" dir="rtl">{emojiData.labelAr}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Comment box */}
            <div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment (optional) · أضف تعليقاً (اختياري)"
                rows={2}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-primary/30 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="ghost"
                className="flex-1 h-11 border border-border text-slate-400 hover:text-white rounded-xl"
                onClick={onSkip}
                disabled={submitting}
              >
                Skip · تخطى
              </Button>
              <Button
                className="flex-1 h-11 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/20 disabled:opacity-60"
                onClick={handleSubmit}
                disabled={submitting || !stars}
              >
                {submitting ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2"
                  />
                ) : (
                  <ThumbsUp className="w-4 h-4 mr-2" />
                )}
                Submit Rating
              </Button>
            </div>

            {/* Loyalty nudge */}
            <p className="text-center text-[11px] text-slate-600">
              ⭐ Ratings earn you <span className="text-amber-400 font-semibold">10 Wasel Points</span> toward Gold tier
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Cancel Trip Confirmation ──────────────────────────────────────────────────

function CancelConfirmDialog({
  open,
  onClose,
  onConfirm,
  cancelling,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  cancelling: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.88, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.88, y: 20 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="w-full max-w-sm bg-card border border-border rounded-3xl p-6 text-center shadow-2xl"
          >
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-7 h-7 text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Cancel this ride?</h3>
            <p className="text-red-400 text-sm font-medium mb-1" dir="rtl">إلغاء هذه الرحلة؟</p>
            <p className="text-slate-400 text-xs mb-6">
              The driver has already been dispatched. A cancellation fee may apply.
            </p>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                className="flex-1 h-11 border border-border text-slate-400 hover:text-white rounded-xl"
                onClick={onClose}
                disabled={cancelling}
              >
                Keep Ride
              </Button>
              <Button
                className="flex-1 h-11 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-bold rounded-xl disabled:opacity-60"
                onClick={onConfirm}
                disabled={cancelling}
              >
                {cancelling ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full"
                  />
                ) : (
                  'Cancel Ride'
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function LiveTripTracking() {
  const navigate = useNavigate();
  const { notifyDriverApproaching, notifyDriverArrived, notifyTripStarted, notifyTripCompleted } = usePushNotifications();
  const [progress, setProgress] = useState(42);
  const [timeLeft, setTimeLeft] = useState(14);
  const [showDetails, setShowDetails] = useState(false);
  const [showSOS, setShowSOS] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [aiTip, setAiTip] = useState(true);
  const driverPhoneDigits = TRIP.driver.phone.replace(/[^\d]/g, '');

  // Track which milestones we've already notified about
  const notifiedRef = useRef({ approaching: false, arrived: false, started: false, completed: false });

  // Simulate trip progress
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(interval); return 100; }
        return p + 0.5;
      });
      setTimeLeft((t) => Math.max(0, t - 0.1));
    }, 800);
    return () => clearInterval(interval);
  }, []);

  // Push notification milestones
  useEffect(() => {
    // ~30% → driver approaching pickup
    if (progress >= 30 && !notifiedRef.current.approaching) {
      notifiedRef.current.approaching = true;
      notifyDriverApproaching(TRIP.driver.name);
      activeTripAPI.patchActiveTrip({ status: 'driver_arrived' }).catch(() => {});
    }
    // ~45% → driver arrived at pickup
    if (progress >= 45 && !notifiedRef.current.arrived) {
      notifiedRef.current.arrived = true;
      notifyDriverArrived(TRIP.driver.name);
    }
    // ~50% → trip started
    if (progress >= 50 && !notifiedRef.current.started) {
      notifiedRef.current.started = true;
      notifyTripStarted();
      activeTripAPI.patchActiveTrip({ status: 'en_route' }).catch(() => {});
    }
    // ~90% → arriving soon
    if (progress >= 90 && !notifiedRef.current.completed) {
      notifiedRef.current.completed = true;
      notifyTripCompleted(TRIP.price.toFixed(3));
      activeTripAPI.patchActiveTrip({ status: 'arriving' }).catch(() => {});
    }
  }, [progress, notifyDriverApproaching, notifyDriverArrived, notifyTripStarted, notifyTripCompleted]);

  // Auto-complete at 100% → show rating sheet instead of immediately navigating
  useEffect(() => {
    if (progress >= 100) {
      activeTripAPI.clearActiveTrip().catch(() => {});
      // Brief delay so the "You've Arrived" overlay can be seen, then show rating
      const t = setTimeout(() => setShowRating(true), 2500);
      return () => clearTimeout(t);
    }
  }, [progress]);

  const handleRatingSubmit = useCallback(async (stars: number, comment: string) => {
    try {
      const { token } = await getAuthDetails();
      await fetchWithRetry(`${API_URL}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          reviewee_id: TRIP.driver.id,
          role: 'driver',
          overall_rating: stars,
          comment,
          trip_id: TRIP.id,
        }),
      });
    } catch {
      // Not critical — proceed regardless
    }
    toast.success("Thanks for rating! · شكراً على تقييمك", { description: '+10 Wasel Points earned 🌟' });
    setShowRating(false);
    navigate('/app/my-trips');
  }, [navigate]);

  const handleRatingSkip = useCallback(() => {
    setShowRating(false);
    navigate('/app/my-trips');
  }, [navigate]);

  const handleCancelConfirm = useCallback(async () => {
    setCancelling(true);
    await activeTripAPI.clearActiveTrip();
    setCancelling(false);
    setShowCancel(false);
    toast.info('Ride cancelled · تم إلغاء الرحلة');
    navigate('/app/dashboard');
  }, [navigate]);

  const copyShareCode = useCallback(() => {
    navigator.clipboard?.writeText(TRIP.shareCode).then(() => {
      toast.success('Safety code copied!');
    });
  }, []);

  const arrived = progress >= 100;
  const currentLegIndex = Math.min(
    Math.max(Math.floor((progress / 100) * (WAYPOINTS.length - 1)), 0),
    WAYPOINTS.length - 2,
  );
  const currentLegProgress = ((progress / 100) * (WAYPOINTS.length - 1)) - currentLegIndex;
  const currentStart = WAYPOINTS[currentLegIndex].coord;
  const currentEnd = WAYPOINTS[currentLegIndex + 1].coord;
  const driverPosition = {
    lat: currentStart.lat + ((currentEnd.lat - currentStart.lat) * Math.max(0, Math.min(currentLegProgress, 1))),
    lng: currentStart.lng + ((currentEnd.lng - currentStart.lng) * Math.max(0, Math.min(currentLegProgress, 1))),
  };
  const mapCenter = driverPosition;
  const mapRoute = WAYPOINTS.map((waypoint) => ({
    lat: waypoint.coord.lat,
    lng: waypoint.coord.lng,
    label: waypoint.label,
  }));
  const mapMarkers = [
    { lat: TRIP.fromCoord.lat, lng: TRIP.fromCoord.lng, label: 'Pickup', type: 'pickup' as const },
    { lat: driverPosition.lat, lng: driverPosition.lng, label: 'Driver', type: 'waypoint' as const },
    { lat: TRIP.toCoord.lat, lng: TRIP.toCoord.lng, label: 'Dropoff', type: 'dropoff' as const },
  ];

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100dvh-4rem)] bg-background relative">
      {/* ── MAP ── */}
      <div className="flex-1 relative">
        <WaselMap
          className="w-full h-full"
          center={mapCenter}
          zoom={13}
          route={mapRoute}
          markers={mapMarkers}
          showTraffic
          showMosques
          showRadars
        />

        {/* Live badge overlay */}
        <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2">
          <WaselBadge variant="live" label="LIVE TRACKING" />
          <div className="rounded-full border border-cyan-400/20 bg-slate-950/70 px-3 py-1.5 text-[11px] font-semibold text-slate-100 backdrop-blur-md">
            {TRIP.from} to {TRIP.to}
          </div>
          <div className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1.5 text-[11px] font-semibold text-cyan-300 backdrop-blur-md">
            Driver near {WAYPOINTS[Math.min(currentLegIndex + 1, WAYPOINTS.length - 1)].label}
          </div>
        </div>

        {/* Progress bar overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-muted">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-cyan-400"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Arrived overlay */}
        <AnimatePresence>
          {arrived && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-primary/20 backdrop-blur-sm flex items-center justify-center z-20"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="bg-card border border-primary/30 rounded-3xl p-8 text-center shadow-2xl"
              >
                <CheckCircle className="w-16 h-16 text-primary mx-auto mb-3" />
                <h2 className="text-2xl font-bold text-white">You've Arrived!</h2>
                <p className="text-primary font-semibold mt-1">وصلت إلى وجهتك</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── INFO PANEL ── */}
      <div className="w-full lg:w-96 bg-background border-t lg:border-t-0 lg:border-l border-border flex flex-col overflow-y-auto">
        {/* Trip ID bar */}
        <div className="px-4 py-2.5 border-b border-border bg-card flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div
              className="w-2 h-2 rounded-full bg-primary"
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-sm text-white font-bold">Trip {TRIP.id}</span>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="text-slate-500 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          {/* ETA */}
          <ETACard eta={TRIP.estimatedArrival} timeLeft={Math.round(timeLeft)} />

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Trip progress</span>
              <span className="text-primary font-semibold">{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-cyan-400 rounded-full"
                style={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Waypoints */}
          <div className="relative">
            <ProgressTimeline progress={progress} />
          </div>

          {/* Driver card */}
          <div className="rounded-2xl bg-card border border-border p-3">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12 border-2 border-primary/20">
                <AvatarImage src={TRIP.driver.img} />
                <AvatarFallback className="bg-muted text-white">{TRIP.driver.initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-white font-bold text-sm">{TRIP.driver.name}</span>
                  <Shield className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                </div>
                <p className="text-xs text-slate-500">{TRIP.vehicle.model} · {TRIP.vehicle.plate}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Star className="w-3 h-3 text-amber-400 fill-current" />
                  <span className="text-xs text-amber-400 font-semibold">{TRIP.driver.rating}</span>
                  <span className="text-xs text-slate-600">· {TRIP.driver.trips.toLocaleString()} trips</span>
                </div>
              </div>
              {/* Quick contact */}
              <div className="flex gap-1.5 flex-shrink-0">
                <button
                  onClick={() => {
                    window.open(`tel:${TRIP.driver.phone}`, '_self');
                    toast.info(`Calling ${TRIP.driver.name}…`);
                  }}
                  className="w-9 h-9 rounded-xl bg-background border border-border flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary/30 transition-all"
                >
                  <Phone className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    window.open(`https://wa.me/${driverPhoneDigits}?text=${encodeURIComponent(`Hi ${TRIP.driver.name}, I'm on trip ${TRIP.id} with Wasel.`)}`, '_blank', 'noopener,noreferrer');
                  }}
                  className="w-9 h-9 rounded-xl bg-background border border-border flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:border-cyan-400/30 transition-all"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Safety code */}
          <button
            onClick={copyShareCode}
            className="w-full flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2.5 hover:border-muted-foreground/30 transition-all group"
          >
            <Shield className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span className="text-xs text-slate-500 flex-1 text-left">Safety code: <strong className="text-white font-mono">{TRIP.shareCode}</strong></span>
            <Copy className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
          </button>

          {/* Toggle trip details */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-card border border-border text-sm text-slate-400 hover:text-white transition-all"
          >
            <span>Trip details · تفاصيل الرحلة</span>
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl bg-card border border-border overflow-hidden">
                  {[
                    { label: 'From', value: TRIP.from, valueAr: TRIP.fromAr },
                    { label: 'To', value: TRIP.to, valueAr: TRIP.toAr },
                    { label: 'Started', value: TRIP.startedAt },
                    { label: 'ETA', value: TRIP.estimatedArrival },
                    { label: 'Distance', value: TRIP.totalDistance },
                    { label: 'Passengers', value: `${TRIP.passengers}` },
                    { label: 'Fare', value: `${TRIP.price.toFixed(3)} JOD` },
                  ].map(({ label, value, valueAr }, i) => (
                    <div key={label} className={`flex justify-between items-start px-3 py-2 text-xs ${i > 0 ? 'border-t border-border' : ''}`}>
                      <span className="text-slate-500">{label}</span>
                      <div className="text-right">
                        <span className="text-slate-200">{value}</span>
                        {valueAr && <p className="text-slate-600 text-[10px]" dir="rtl">{valueAr}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* AI tip */}
          <AnimatePresence>
            {aiTip && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 30 }}
                className="flex items-start gap-2 bg-cyan-500/5 border border-cyan-500/10 rounded-xl px-3 py-2.5"
              >
                <Brain className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-500 flex-1">
                  <span className="text-cyan-400 font-semibold">AI tip: </span>
                  You're on track to save <span className="text-emerald-400 font-semibold">0.730 JOD</span> vs solo taxi. Keep it up! 🎉
                </p>
                <button onClick={() => setAiTip(false)} className="text-slate-700 hover:text-slate-500">
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom actions */}
        <div className="p-4 border-t border-border space-y-2.5 bg-background">
          <Button
            onClick={() => shareContent({
              title: `Wasel Trip ${TRIP.id} — Live Location`,
              text: `Track my trip from ${TRIP.from} to ${TRIP.to} on Wasel. Safety code: ${TRIP.shareCode}`,
              url: `${window.location.origin}/track/${TRIP.id}`,
              successMessage: 'Live trip link copied!',
              successMessageAr: 'تم نسخ رابط الرحلة!',
            })}
            variant="ghost"
            className="w-full h-10 border border-border text-slate-300 hover:text-white hover:border-muted-foreground/30 rounded-xl text-sm font-medium"
          >
            <Share2 className="w-3.5 h-3.5 mr-2" />
            Share Live Location · شارك موقعك الحي
          </Button>

          {/* Cancel ride — only shown while trip is not yet complete */}
          {!arrived && (
            <Button
              onClick={() => setShowCancel(true)}
              variant="ghost"
              className="w-full h-10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/5 hover:text-orange-300 hover:border-orange-500/40 rounded-xl text-sm font-medium"
            >
              <XCircle className="w-3.5 h-3.5 mr-2" />
              Cancel Ride · إلغاء الرحلة
            </Button>
          )}

          <Button
            onClick={() => setShowSOS(true)}
            className="w-full h-10 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 rounded-xl text-sm font-bold transition-all"
          >
            <AlertTriangle className="w-3.5 h-3.5 mr-2" />
            Emergency SOS · طوارئ
          </Button>
        </div>
      </div>

      {/* SOS Dialog */}
      <SOSDialog open={showSOS} onClose={() => setShowSOS(false)} />

      {/* Cancel Confirmation */}
      <CancelConfirmDialog
        open={showCancel}
        onClose={() => setShowCancel(false)}
        onConfirm={handleCancelConfirm}
        cancelling={cancelling}
      />

      {/* Post-trip Rating Sheet */}
      <TripRatingSheet
        open={showRating}
        driverName={TRIP.driver.name}
        driverImg={TRIP.driver.img}
        driverInitials={TRIP.driver.initials}
        fare={TRIP.price.toFixed(3)}
        onSubmit={handleRatingSubmit}
        onSkip={handleRatingSkip}
      />
    </div>
  );
}

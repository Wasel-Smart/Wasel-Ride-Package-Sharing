import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, type RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const C = {
  bg: '#0A1628', card: '#0E1D35', card2: '#112240',
  cyan: '#00C8E8', green: '#00C875', gold: '#F0A830',
  border: 'rgba(255,255,255,0.08)', text: '#EFF6FF', muted: '#5A7A9A', sub: '#8AA4C0',
} as const;

type RideDetailRoute = RouteProp<RootStackParamList, 'RideDetail'>;

interface RideDetails {
  id: string;
  from: string;
  to: string;
  date: string;
  time: string;
  price: number;
  seats: number;
  car_model: string;
  gender: string;
  prayer: boolean;
  note: string;
  driver_name: string;
  driver_rating: number;
  driver_verified: boolean;
}

export default function RideDetailScreen() {
  const route = useRoute<RideDetailRoute>();
  const nav = useNavigation();
  const { user } = useAuth();
  const { rideId } = route.params;

  const [ride, setRide] = useState<RideDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadRide();
  }, [rideId]);

  const loadRide = async () => {
    setLoading(true);
    try {
      const { data, error: fetchErr } = await supabase
        .from('trips')
        .select(`
          id,
          from_location,
          to_location,
          departure_date,
          departure_time,
          price_per_seat,
          available_seats,
          vehicle_model,
          gender_preference,
          prayer_stop,
          notes,
          profiles!owner_id (full_name, rating, verified)
        `)
        .eq('id', rideId)
        .single();

      if (fetchErr || !data) throw fetchErr ?? new Error('Ride not found');

      const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
      setRide({
        id: String(data.id),
        from: String(data.from_location ?? ''),
        to: String(data.to_location ?? ''),
        date: String(data.departure_date ?? ''),
        time: String(data.departure_time ?? ''),
        price: Number(data.price_per_seat ?? 0),
        seats: Number(data.available_seats ?? 0),
        car_model: String(data.vehicle_model ?? 'Private vehicle'),
        gender: String(data.gender_preference ?? 'mixed'),
        prayer: Boolean(data.prayer_stop),
        note: String(data.notes ?? ''),
        driver_name: String((profile as any)?.full_name ?? 'Wasel Captain'),
        driver_rating: Number((profile as any)?.rating ?? 4.8),
        driver_verified: Boolean((profile as any)?.verified),
      });
    } catch {
      setError('Could not load this ride. It may no longer be available.');
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async () => {
    if (!user?.id || !ride) return;
    setBooking(true);
    setError(null);
    try {
      const { error: bookErr } = await supabase.from('bookings').insert({
        trip_id: rideId,
        passenger_id: user.id,
        seats_requested: 1,
        pickup_location: ride.from,
        dropoff_location: ride.to,
        status: 'pending',
        created_at: new Date().toISOString(),
      });
      if (bookErr) throw bookErr;
      setBooked(true);
    } catch {
      setError('Unable to book this ride. Please try again.');
    } finally {
      setBooking(false);
    }
  };

  const genderLabel = ride?.gender === 'women_only' ? 'Women Only'
    : ride?.gender === 'family_only' ? 'Family Only'
    : 'Mixed';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {loading ? (
        <View style={styles.loader}><ActivityIndicator size="large" color={C.cyan} /></View>
      ) : !ride || error ? (
        <View style={styles.errorWrap}>
          <Ionicons name="alert-circle-outline" size={48} color={C.gold} />
          <Text style={styles.errorText}>{error ?? 'Ride not found.'}</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => nav.goBack()}>
            <Text style={styles.backBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Route banner */}
          <View style={styles.routeBanner}>
            <View style={styles.routePoint}>
              <View style={[styles.dot, { backgroundColor: C.green }]} />
              <Text style={styles.cityName}>{ride.from}</Text>
            </View>
            <Ionicons name="arrow-forward" size={22} color={C.muted} />
            <View style={styles.routePoint}>
              <View style={[styles.dot, { backgroundColor: C.cyan }]} />
              <Text style={styles.cityName}>{ride.to}</Text>
            </View>
          </View>

          {/* Price */}
          <View style={styles.priceCard}>
            <Text style={styles.priceValue}>{ride.price.toFixed(2)}</Text>
            <Text style={styles.priceCurrency}>JOD / seat</Text>
          </View>

          {/* Driver */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Driver</Text>
            <View style={styles.driverCard}>
              <View style={styles.driverAvatar}>
                <Text style={styles.driverInitial}>{ride.driver_name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.driverName}>{ride.driver_name}</Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={13} color="#F59E0B" />
                  <Text style={styles.ratingText}>{ride.driver_rating.toFixed(1)}</Text>
                  {ride.driver_verified && (
                    <View style={styles.verifiedBadge}>
                      <Text style={styles.verifiedText}>Verified</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trip details</Text>
            <View style={styles.detailsGrid}>
              {[
                { icon: 'calendar-outline', label: 'Date', value: ride.date },
                { icon: 'time-outline', label: 'Departure', value: ride.time },
                { icon: 'people-outline', label: 'Seats available', value: String(ride.seats) },
                { icon: 'car-outline', label: 'Vehicle', value: ride.car_model },
                { icon: 'person-outline', label: 'Preference', value: genderLabel },
                { icon: 'location-outline', label: 'Prayer stop', value: ride.prayer ? 'Yes' : 'No' },
              ].map(item => (
                <View key={item.label} style={styles.detailItem}>
                  <Ionicons name={item.icon as any} size={16} color={C.muted} />
                  <View>
                    <Text style={styles.detailLabel}>{item.label}</Text>
                    <Text style={styles.detailValue}>{item.value}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Note */}
          {ride.note ? (
            <View style={styles.noteCard}>
              <Text style={styles.sectionTitle}>Driver note</Text>
              <Text style={styles.noteText}>{ride.note}</Text>
            </View>
          ) : null}

          {/* Error */}
          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={16} color={C.gold} />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          {/* Booking CTA */}
          {booked ? (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={22} color={C.green} />
              <Text style={styles.successText}>
                Booking request sent! Check My Trips for updates from the driver.
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.bookBtn, ride.seats === 0 && styles.bookBtnDisabled]}
              onPress={handleBook}
              disabled={booking || ride.seats === 0}
            >
              {booking ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={styles.bookBtnText}>
                    {ride.seats === 0 ? 'Fully booked' : `Book seat — ${ride.price.toFixed(2)} JOD`}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },
  errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 40 },
  errorText: { fontSize: 15, color: C.gold, textAlign: 'center', lineHeight: 22 },
  backBtn: { backgroundColor: C.card, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12, borderWidth: 1, borderColor: C.border },
  backBtnText: { color: C.text, fontWeight: '700' },
  routeBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: C.border, marginTop: 8 },
  routePoint: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  cityName: { fontSize: 18, fontWeight: '800', color: C.text },
  priceCard: { backgroundColor: C.cyan + '18', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: C.cyan + '40', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  priceValue: { fontSize: 36, fontWeight: '800', color: C.cyan },
  priceCurrency: { fontSize: 14, color: C.muted, fontWeight: '600', alignSelf: 'flex-end', marginBottom: 6 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  driverCard: { backgroundColor: C.card, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: C.border },
  driverAvatar: { width: 48, height: 48, borderRadius: 14, backgroundColor: C.cyan + '22', alignItems: 'center', justifyContent: 'center' },
  driverInitial: { fontSize: 20, fontWeight: '800', color: C.cyan },
  driverName: { fontSize: 16, fontWeight: '700', color: C.text },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  ratingText: { fontSize: 13, color: '#F59E0B', fontWeight: '600' },
  verifiedBadge: { backgroundColor: C.green + '22', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  verifiedText: { fontSize: 10, color: C.green, fontWeight: '700' },
  detailsGrid: { backgroundColor: C.card, borderRadius: 16, padding: 14, gap: 12, borderWidth: 1, borderColor: C.border },
  detailItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  detailLabel: { fontSize: 11, color: C.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  detailValue: { fontSize: 14, fontWeight: '600', color: C.text },
  noteCard: { backgroundColor: C.card, borderRadius: 14, padding: 16, gap: 8, borderWidth: 1, borderColor: C.border },
  noteText: { fontSize: 14, color: C.sub, lineHeight: 22 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.gold + '18', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.gold + '30' },
  errorBannerText: { fontSize: 13, color: C.gold, flex: 1 },
  successBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: C.green + '18', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.green + '40' },
  successText: { flex: 1, fontSize: 14, color: C.green, lineHeight: 22, fontWeight: '600' },
  bookBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: C.cyan, borderRadius: 16, height: 56 },
  bookBtnDisabled: { opacity: 0.5 },
  bookBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});

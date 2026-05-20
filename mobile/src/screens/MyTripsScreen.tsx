import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { useHaptics } from '../hooks/useHaptics';
import { supabase } from '../lib/supabase';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { C, S, R, T } from '../theme';

interface Booking {
  id: string;
  trip_id: string;
  status: string;
  seats_requested: number;
  created_at: string;
  trip: {
    from_city: string;
    to_city: string;
    departure_date: string;
    departure_time: string;
    price_per_seat: number;
    driver: {
      full_name: string;
      rating: number;
    };
  };
}

type Tab = 'active' | 'past';

export default function MyTripsScreen() {
  const { user } = useAuth();
  const { light } = useHaptics();
  const nav = useNavigation();

  const [tab, setTab] = useState<Tab>('active');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.id) void loadBookings();
  }, [user?.id, tab]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const statusFilter = tab === 'active' 
        ? ['pending', 'confirmed', 'active', 'in_progress']
        : ['completed', 'cancelled', 'rejected'];

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id, trip_id, status, seats_requested, created_at,
          trips!inner (
            from_city, to_city, departure_date, departure_time, price_per_seat,
            profiles!driver_id (full_name, rating)
          )
        `)
        .eq('passenger_id', user!.id)
        .in('status', statusFilter)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings((data || []) as any);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    light();
    await loadBookings();
    setRefreshing(false);
  };

  const handleCancelBooking = async (bookingId: string) => {
    light();
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', bookingId);

      if (error) throw error;
      await loadBookings();
    } catch (err) {
      console.error('Failed to cancel booking:', err);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={styles.header}>
        <Text style={styles.title}>My Trips</Text>
        <Text style={styles.subtitle}>Your bookings and ride history</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['active', 'past'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => { light(); setTab(t); }}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t }}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'active' ? 'Active' : 'Past'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={C.cyan} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.cyan} />
          }
        >
          {bookings.length === 0 ? (
            <EmptyState
              icon="car-outline"
              title={tab === 'active' ? 'No active trips' : 'No past trips'}
              subtitle={tab === 'active' ? 'Book your first ride to get started' : 'Your completed trips will appear here'}
              actionLabel={tab === 'active' ? 'Find a ride' : undefined}
              onAction={tab === 'active' ? () => nav.navigate('FindRide' as any) : undefined}
            />
          ) : (
            bookings.map(booking => (
              <TouchableOpacity
                key={booking.id}
                style={styles.bookingCard}
                activeOpacity={0.85}
                onPress={() => { light(); nav.navigate('RideDetail' as any, { rideId: booking.trip_id }); }}
                accessibilityLabel={`Trip from ${booking.trip.from_city} to ${booking.trip.to_city}`}
                accessibilityRole="button"
              >
                <View style={styles.bookingHeader}>
                  <StatusBadge status={booking.status} size="sm" />
                  <Text style={styles.bookingDate}>
                    {new Date(booking.created_at).toLocaleDateString()}
                  </Text>
                </View>

                <View style={styles.routeRow}>
                  <View style={styles.routePoint}>
                    <View style={[styles.dot, { backgroundColor: C.green }]} />
                    <Text style={styles.cityText}>{booking.trip.from_city}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={16} color={C.muted} />
                  <View style={styles.routePoint}>
                    <View style={[styles.dot, { backgroundColor: C.cyan }]} />
                    <Text style={styles.cityText}>{booking.trip.to_city}</Text>
                  </View>
                </View>

                <View style={styles.bookingMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={14} color={C.muted} />
                    <Text style={styles.metaText}>{booking.trip.departure_date}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={14} color={C.muted} />
                    <Text style={styles.metaText}>{booking.trip.departure_time}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="people-outline" size={14} color={C.muted} />
                    <Text style={styles.metaText}>{booking.seats_requested} seat(s)</Text>
                  </View>
                </View>

                <View style={styles.bookingFooter}>
                  <View>
                    <Text style={styles.driverLabel}>Driver</Text>
                    <Text style={styles.driverName}>{booking.trip.driver.full_name}</Text>
                  </View>
                  <Text style={styles.price}>
                    {(booking.trip.price_per_seat * booking.seats_requested).toFixed(2)} JOD
                  </Text>
                </View>

                {tab === 'active' && booking.status === 'pending' && (
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={(e) => { e.stopPropagation(); handleCancelBooking(booking.id); }}
                    accessibilityLabel="Cancel booking"
                    accessibilityRole="button"
                  >
                    <Text style={styles.cancelText}>Cancel booking</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: S.xl, paddingTop: S.lg, paddingBottom: S.sm },
  title: { ...T.h1 },
  subtitle: { ...T.small, marginTop: 2 },
  tabs: { flexDirection: 'row', gap: S.sm, paddingHorizontal: S.xl, marginBottom: S.lg },
  tab: { flex: 1, height: 42, borderRadius: R.md, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  tabActive: { borderColor: C.cyan, backgroundColor: C.cyanDim },
  tabText: { fontSize: 14, fontWeight: '600', color: C.muted },
  tabTextActive: { color: C.cyan },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: S.xl, paddingBottom: S['4xl'], gap: S.md },
  bookingCard: { backgroundColor: C.card, borderRadius: R.lg, padding: S.lg, borderWidth: 1, borderColor: C.border, gap: S.md },
  bookingHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bookingDate: { fontSize: 12, color: C.muted },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  routePoint: { flexDirection: 'row', alignItems: 'center', gap: S.sm, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  cityText: { fontSize: 15, fontWeight: '700', color: C.text },
  bookingMeta: { flexDirection: 'row', gap: S.md, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: C.sub },
  bookingFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: S.sm, borderTopWidth: 1, borderTopColor: C.border },
  driverLabel: { fontSize: 11, color: C.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  driverName: { fontSize: 14, fontWeight: '600', color: C.text, marginTop: 2 },
  price: { fontSize: 18, fontWeight: '800', color: C.cyan },
  cancelBtn: { backgroundColor: C.redDim, borderRadius: R.sm, padding: S.md, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,77,106,0.30)' },
  cancelText: { fontSize: 13, fontWeight: '700', color: C.red },
});

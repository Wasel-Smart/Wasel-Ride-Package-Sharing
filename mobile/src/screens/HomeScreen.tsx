import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../hooks/useAuth';
import { useOptimizedRides } from '../hooks/useOptimizedRides';
import { useHaptics } from '../hooks/useHaptics';

const { width } = Dimensions.get('window');

const C = {
  bg: '#0A1628',
  card: '#0E1D35',
  card2: '#112240',
  cyan: '#00C8E8',
  green: '#00C875',
  gold: '#F0A830',
  border: 'rgba(255,255,255,0.08)',
  text: '#EFF6FF',
  muted: '#5A7A9A',
  sub: '#8AA4C0',
} as const;

type NavProp = NativeStackNavigationProp<RootStackParamList>;

type ServiceScreen = keyof RootStackParamList;

interface ServiceItem {
  id: string;
  icon: string;
  label: string;
  color: string;
  screen: ServiceScreen;
}

const SERVICES: ServiceItem[] = [
  { id: 'find',    icon: 'search',  label: 'Find Ride',  color: C.cyan,     screen: 'FindRide'  },
  { id: 'offer',   icon: 'car',     label: 'Offer Ride', color: C.green,    screen: 'OfferRide' },
  { id: 'wallet',  icon: 'wallet',  label: 'Wallet',     color: C.gold,     screen: 'Wallet'    },
  { id: 'profile', icon: 'person',  label: 'Profile',    color: '#A78BFA',  screen: 'Profile'   },
];

export default function HomeScreen() {
  const { user } = useAuth();
  const { rides, loading, refetch } = useOptimizedRides();
  const { light } = useHaptics();
  const nav = useNavigation<NavProp>();
  const [refreshing, setRefreshing] = React.useState(false);

  const firstName = (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0] ?? 'Traveller';

  const handleRefresh = async () => {
    setRefreshing(true);
    light();
    await refetch();
    setRefreshing(false);
  };

  const featuredRides = rides.slice(0, 3);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.cyan} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good day, {firstName} 👋</Text>
            <Text style={styles.tagline}>Where are you heading today?</Text>
          </View>
          <TouchableOpacity 
            style={styles.notifBtn}
            onPress={() => { light(); nav.navigate('Notifications' as any); }}
            accessibilityLabel="View notifications"
            accessibilityRole="button"
          >
            <Ionicons name="notifications-outline" size={22} color={C.text} />
          </TouchableOpacity>
        </View>

        {/* Quick search banner */}
        <TouchableOpacity
          style={styles.searchBanner}
          activeOpacity={0.85}
          onPress={() => { light(); nav.navigate('FindRide'); }}
          accessibilityLabel="Search for rides from Amman to Aqaba"
          accessibilityRole="search"
        >
          <Ionicons name="search" size={18} color={C.muted} />
          <Text style={styles.searchPlaceholder}>Search rides — Amman to Aqaba…</Text>
          <View style={styles.searchBadge}>
            <Text style={styles.searchBadgeText}>Go</Text>
          </View>
        </TouchableOpacity>

        {/* Services grid */}
        <Text style={styles.sectionTitle}>Services</Text>
        <View style={styles.servicesGrid}>
          {SERVICES.map(svc => (
            <TouchableOpacity
              key={svc.id}
              style={styles.serviceCard}
              activeOpacity={0.8}
              onPress={() => { light(); nav.navigate(svc.screen); }}
              accessibilityLabel={`${svc.label} service`}
              accessibilityRole="button"
            >
              <View style={[styles.serviceIcon, { backgroundColor: svc.color + '22', borderColor: svc.color + '33' }]}>
                <Ionicons name={svc.icon as React.ComponentProps<typeof Ionicons>['name']} size={24} color={svc.color} />
              </View>
              <Text style={styles.serviceLabel}>{svc.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Featured rides */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Available now</Text>
          <TouchableOpacity 
            onPress={() => { light(); nav.navigate('FindRide'); }}
            accessibilityLabel="See all available rides"
            accessibilityRole="button"
          >
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <View style={styles.skeletonWrap}>
            {[1, 2].map(i => <View key={i} style={styles.skeleton} />)}
          </View>
        ) : featuredRides.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="car-outline" size={40} color={C.muted} />
            <Text style={styles.emptyTitle}>No rides right now</Text>
            <Text style={styles.emptySub}>Pull to refresh or offer your own route.</Text>
          </View>
        ) : (
          featuredRides.map(ride => (
            <TouchableOpacity
              key={ride.id}
              style={styles.rideCard}
              activeOpacity={0.85}
              onPress={() => { light(); nav.navigate('RideDetail', { rideId: ride.id }); }}
              accessibilityLabel={`Ride from ${ride.from} to ${ride.to}, ${ride.price_jod} JOD, ${ride.seats_available} seats available`}
              accessibilityRole="button"
            >
              {/* Accent bar */}
              <View style={styles.rideAccent} />
              <View style={styles.rideBody}>
                <View style={styles.rideTop}>
                  <View style={styles.driverAvatar}>
                    <Text style={styles.driverInitial}>
                      {ride.driver_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.driverName}>{ride.driver_name}</Text>
                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={12} color="#F59E0B" />
                      <Text style={styles.ratingText}>{ride.driver_rating.toFixed(1)}</Text>
                      {ride.driver_verified && (
                        <View style={styles.verifiedBadge}>
                          <Text style={styles.verifiedText}>Verified</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.priceBlock}>
                    <Text style={styles.priceValue}>{ride.price_jod}</Text>
                    <Text style={styles.priceCurrency}>JOD</Text>
                  </View>
                </View>

                <View style={styles.routeRow}>
                  <View style={styles.routePoint}>
                    <View style={[styles.dot, { backgroundColor: C.green }]} />
                    <Text style={styles.cityName}>{ride.from}</Text>
                  </View>
                  <View style={styles.routeLine} />
                  <View style={styles.routePoint}>
                    <View style={[styles.dot, { backgroundColor: C.cyan }]} />
                    <Text style={styles.cityName}>{ride.to}</Text>
                  </View>
                </View>

                <View style={styles.rideMeta}>
                  <View style={styles.metaChip}>
                    <Ionicons name="calendar-outline" size={12} color={C.muted} />
                    <Text style={styles.metaText}>{ride.date}</Text>
                  </View>
                  <View style={styles.metaChip}>
                    <Ionicons name="time-outline" size={12} color={C.muted} />
                    <Text style={styles.metaText}>{ride.time}</Text>
                  </View>
                  <View style={styles.metaChip}>
                    <Ionicons name="people-outline" size={12} color={C.muted} />
                    <Text style={styles.metaText}>{ride.seats_available} seats</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Stats banner */}
        <View style={styles.statsBanner}>
          {[
            { label: 'Cities', value: '12+' },
            { label: 'Drivers', value: '400+' },
            { label: 'Trips/day', value: '1,200+' },
          ].map(stat => (
            <View key={stat.label} style={styles.statItem}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, marginBottom: 20 },
  greeting: { fontSize: 22, fontWeight: '700', color: C.text },
  tagline: { fontSize: 14, color: C.muted, marginTop: 2 },
  notifBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  searchBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border, marginBottom: 24 },
  searchPlaceholder: { flex: 1, fontSize: 14, color: C.muted },
  searchBadge: { backgroundColor: C.cyan, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6 },
  searchBadgeText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 12 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  seeAll: { fontSize: 13, color: C.cyan, fontWeight: '600' },
  servicesGrid: { flexDirection: 'row', gap: 10, marginBottom: 28, flexWrap: 'wrap' },
  serviceCard: { width: (width - 60) / 2, backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border, alignItems: 'center', gap: 10 },
  serviceIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  serviceLabel: { fontSize: 13, fontWeight: '600', color: C.text },
  skeletonWrap: { gap: 12 },
  skeleton: { height: 130, backgroundColor: C.card, borderRadius: 16, opacity: 0.5 },
  emptyCard: { backgroundColor: C.card, borderRadius: 16, padding: 32, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: C.border, marginBottom: 20 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  emptySub: { fontSize: 13, color: C.muted, textAlign: 'center' },
  rideCard: { backgroundColor: C.card, borderRadius: 18, overflow: 'hidden', marginBottom: 14, borderWidth: 1, borderColor: C.border },
  rideAccent: { height: 3, backgroundColor: C.cyan },
  rideBody: { padding: 16, gap: 14 },
  rideTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  driverAvatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.cyan + '22', alignItems: 'center', justifyContent: 'center' },
  driverInitial: { fontSize: 18, fontWeight: '800', color: C.cyan },
  driverName: { fontSize: 15, fontWeight: '700', color: C.text },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ratingText: { fontSize: 12, color: '#F59E0B', fontWeight: '600' },
  verifiedBadge: { backgroundColor: C.green + '22', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  verifiedText: { fontSize: 10, color: C.green, fontWeight: '700' },
  priceBlock: { alignItems: 'flex-end' },
  priceValue: { fontSize: 24, fontWeight: '800', color: C.cyan, lineHeight: 28 },
  priceCurrency: { fontSize: 11, color: C.muted, fontWeight: '600' },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routePoint: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  cityName: { fontSize: 14, fontWeight: '700', color: C.text },
  routeLine: { flex: 1, height: 1, backgroundColor: C.border },
  rideMeta: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.card2, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  metaText: { fontSize: 11, color: C.sub },
  statsBanner: { backgroundColor: C.card, borderRadius: 16, padding: 20, flexDirection: 'row', justifyContent: 'space-around', borderWidth: 1, borderColor: C.border, marginTop: 8 },
  statItem: { alignItems: 'center', gap: 4 },
  statValue: { fontSize: 20, fontWeight: '800', color: C.cyan },
  statLabel: { fontSize: 12, color: C.muted },
});

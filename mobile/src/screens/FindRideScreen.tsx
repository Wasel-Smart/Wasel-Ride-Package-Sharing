import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator, FlatList, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useRides, type MobileRide } from '../hooks/useRides';
import { useHaptics } from '../hooks/useHaptics';
import { useDebouncedCallback } from '../hooks/useDebounce';

const C = {
  bg: '#0A1628', card: '#0E1D35', card2: '#112240',
  cyan: '#00C8E8', green: '#00C875', gold: '#F0A830',
  border: 'rgba(255,255,255,0.08)', text: '#EFF6FF', muted: '#5A7A9A', sub: '#8AA4C0',
} as const;

const CITIES = ['Amman', 'Aqaba', 'Irbid', 'Zarqa', 'Salt', 'Karak', 'Jerash', 'Madaba'];

type NavProp = NativeStackNavigationProp<RootStackParamList>;

function RideResultCard({ ride, onPress }: { ride: MobileRide; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.rideCard} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.rideAccent} />
      <View style={styles.rideBody}>
        <View style={styles.rideTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{ride.driver_name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.driverName}>{ride.driver_name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <Ionicons name="star" size={11} color="#F59E0B" />
              <Text style={styles.ratingText}>{ride.driver_rating.toFixed(1)}</Text>
              {ride.driver_verified && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
            </View>
          </View>
          <View>
            <Text style={styles.price}>{ride.price_jod}</Text>
            <Text style={styles.priceSub}>JOD/seat</Text>
          </View>
        </View>

        <View style={styles.routeRow}>
          <View style={styles.cityBlock}>
            <View style={[styles.dot, { backgroundColor: C.green }]} />
            <Text style={styles.cityText}>{ride.from}</Text>
          </View>
          <Ionicons name="arrow-forward" size={16} color={C.muted} />
          <View style={styles.cityBlock}>
            <View style={[styles.dot, { backgroundColor: C.cyan }]} />
            <Text style={styles.cityText}>{ride.to}</Text>
          </View>
        </View>

        <View style={styles.chips}>
          <View style={styles.chip}><Ionicons name="calendar-outline" size={11} color={C.muted} /><Text style={styles.chipText}>{ride.date}</Text></View>
          <View style={styles.chip}><Ionicons name="time-outline" size={11} color={C.muted} /><Text style={styles.chipText}>{ride.time}</Text></View>
          <View style={styles.chip}><Ionicons name="people-outline" size={11} color={C.muted} /><Text style={styles.chipText}>{ride.seats_available} seats</Text></View>
          {ride.accepts_packages && <View style={[styles.chip, { borderColor: C.gold + '40' }]}><Ionicons name="cube-outline" size={11} color={C.gold} /><Text style={[styles.chipText, { color: C.gold }]}>Packages</Text></View>}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function FindRideScreen() {
  const nav = useNavigation<NavProp>();
  const { rides, loading, error, searchRides } = useRides();
  const { light, medium } = useHaptics();

  const [from, setFrom] = useState('Amman');
  const [to, setTo] = useState('Aqaba');
  const [date, setDate] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [activeField, setActiveField] = useState<'from' | 'to' | null>(null);
  const [sortBy, setSortBy] = useState<'price' | 'rating' | 'time'>('rating');

  const debouncedSearch = useDebouncedCallback(async () => {
    if (from === to) return;
    setHasSearched(true);
    await searchRides(from, to, date || undefined);
  }, 300);

  const handleSearch = async () => {
    if (from === to) return;
    medium();
    Keyboard.dismiss();
    setActiveField(null);
    await debouncedSearch();
  };

  const sortedRides = [...rides].sort((a, b) =>
    sortBy === 'price' ? a.price_jod - b.price_jod :
    sortBy === 'time'  ? a.time.localeCompare(b.time) :
    b.driver_rating - a.driver_rating,
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Find a Ride</Text>
        <Text style={styles.headerSub}>Search corridors across Jordan</Text>
      </View>

      {/* Search panel */}
      <View style={styles.searchPanel}>
        <View style={styles.fieldRow}>
          <Ionicons name="location" size={18} color={C.green} style={{ marginTop: 11 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>From</Text>
            <TextInput
              style={styles.fieldInput}
              value={from}
              onChangeText={setFrom}
              onFocus={() => setActiveField('from')}
              placeholder="Departure city"
              placeholderTextColor={C.muted}
              selectionColor={C.cyan}
            />
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.fieldRow}>
          <Ionicons name="location" size={18} color={C.cyan} style={{ marginTop: 11 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>To</Text>
            <TextInput
              style={styles.fieldInput}
              value={to}
              onChangeText={setTo}
              onFocus={() => setActiveField('to')}
              placeholder="Destination city"
              placeholderTextColor={C.muted}
              selectionColor={C.cyan}
            />
          </View>
        </View>

        {/* City suggestions */}
        {activeField && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestions} contentContainerStyle={{ gap: 8 }}>
            {CITIES.filter(c => c !== (activeField === 'from' ? from : to)).map(city => (
              <TouchableOpacity
                key={city}
                style={styles.suggestionChip}
                onPress={() => { 
                  light();
                  if (activeField === 'from') setFrom(city); 
                  else setTo(city); 
                  setActiveField(null); 
                }}
              >
                <Text style={styles.suggestionText}>{city}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <TouchableOpacity
          style={[styles.searchBtn, from === to && styles.searchBtnDisabled]}
          onPress={handleSearch}
          disabled={from === to || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="search" size={18} color="#fff" />
              <Text style={styles.searchBtnText}>Search rides</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Sort bar */}
      {hasSearched && !loading && (
        <View style={styles.sortBar}>
          <Text style={styles.resultsCount}>{sortedRides.length} ride{sortedRides.length !== 1 ? 's' : ''} found</Text>
          <View style={styles.sortBtns}>
            {(['price', 'rating', 'time'] as const).map(key => (
              <TouchableOpacity
                key={key}
                style={[styles.sortBtn, sortBy === key && styles.sortBtnActive]}
                onPress={() => setSortBy(key)}
              >
                <Text style={[styles.sortBtnText, sortBy === key && styles.sortBtnTextActive]}>
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Results */}
      {error ? (
        <View style={styles.errorWrap}>
          <Ionicons name="alert-circle-outline" size={40} color={C.gold} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : !hasSearched ? (
        <View style={styles.promptWrap}>
          <Ionicons name="compass-outline" size={56} color={C.muted} />
          <Text style={styles.promptTitle}>Pick a route above</Text>
          <Text style={styles.promptSub}>Choose departure and destination, then tap Search.</Text>
        </View>
      ) : (
        <FlatList
          data={sortedRides}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <RideResultCard
              ride={item}
              onPress={() => { light(); nav.navigate('RideDetail', { rideId: item.id }); }}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 12 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="car-outline" size={48} color={C.muted} />
              <Text style={styles.emptyTitle}>No rides found</Text>
              <Text style={styles.emptySub}>Try a different date or save an alert for this route.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.text },
  headerSub: { fontSize: 13, color: C.muted, marginTop: 2 },
  searchPanel: { margin: 20, backgroundColor: C.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: C.border, gap: 2 },
  fieldRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  fieldLabel: { fontSize: 11, color: C.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldInput: { fontSize: 16, color: C.text, paddingVertical: 4, fontWeight: '600' },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 8, marginLeft: 28 },
  suggestions: { marginTop: 10 },
  suggestionChip: { backgroundColor: C.card2, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: C.border },
  suggestionText: { color: C.sub, fontSize: 13, fontWeight: '600' },
  searchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: C.cyan, borderRadius: 14, height: 50, marginTop: 12 },
  searchBtnDisabled: { opacity: 0.5 },
  searchBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  sortBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  resultsCount: { fontSize: 13, color: C.muted, fontWeight: '600' },
  sortBtns: { flexDirection: 'row', gap: 6 },
  sortBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: C.border },
  sortBtnActive: { borderColor: C.cyan, backgroundColor: C.cyan + '15' },
  sortBtnText: { fontSize: 12, color: C.muted, fontWeight: '600' },
  sortBtnTextActive: { color: C.cyan },
  rideCard: { backgroundColor: C.card, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  rideAccent: { height: 3, backgroundColor: C.cyan },
  rideBody: { padding: 16, gap: 12 },
  rideTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.cyan + '22', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800', color: C.cyan },
  driverName: { fontSize: 15, fontWeight: '700', color: C.text },
  ratingText: { fontSize: 12, color: '#F59E0B', fontWeight: '600' },
  verifiedBadge: { backgroundColor: C.green + '22', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  verifiedText: { fontSize: 10, color: C.green, fontWeight: '700' },
  price: { fontSize: 22, fontWeight: '800', color: C.cyan, textAlign: 'right' },
  priceSub: { fontSize: 11, color: C.muted, textAlign: 'right' },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cityBlock: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  cityText: { fontSize: 15, fontWeight: '700', color: C.text },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.card2, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: C.border },
  chipText: { fontSize: 11, color: C.sub },
  errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontSize: 14, color: C.gold, textAlign: 'center', paddingHorizontal: 40 },
  promptWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  promptTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  promptSub: { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 22 },
  emptyWrap: { paddingTop: 60, alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  emptySub: { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 20 },
});

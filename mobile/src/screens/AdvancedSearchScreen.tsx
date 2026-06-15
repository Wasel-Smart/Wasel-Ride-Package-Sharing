import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View, Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import {
  InfoCard,
  MetricTile,
  PremiumPanel,
  PrimaryButton,
  RoutePreview,
  ScreenShell,
  SectionHeader,
  StateNotice,
  StatusPill,
} from '../components/MobilePrimitives';
import { colors, hitSlop, radii, shadows, spacing, typography } from '../theme';

interface RideOption {
  id: string;
  driverName: string;
  rating: number;
  vehicleType: string;
  priceJod: number;
  departureTime: string;
  seatsAvailable: number;
  verified: boolean;
  instantBook: boolean;
  from: string;
  to: string;
  distance: string;
}

const MOCK_RIDES: RideOption[] = [
  {
    id: '1',
    driverName: 'Ahmad K.',
    rating: 4.9,
    vehicleType: 'Toyota Camry',
    priceJod: 5.5,
    departureTime: '14:30',
    seatsAvailable: 3,
    verified: true,
    instantBook: true,
    from: 'Amman',
    to: 'Irbid',
    distance: '85 km',
  },
  {
    id: '2',
    driverName: 'Fatima S.',
    rating: 5.0,
    vehicleType: 'Honda Accord',
    priceJod: 6.0,
    departureTime: '15:00',
    seatsAvailable: 2,
    verified: true,
    instantBook: true,
    from: 'Amman',
    to: 'Irbid',
    distance: '85 km',
  },
  {
    id: '3',
    driverName: 'Khaled M.',
    rating: 4.7,
    vehicleType: 'Hyundai Elantra',
    priceJod: 4.5,
    departureTime: '16:30',
    seatsAvailable: 4,
    verified: true,
    instantBook: false,
    from: 'Amman',
    to: 'Irbid',
    distance: '85 km',
  },
  {
    id: '4',
    driverName: 'Sara L.',
    rating: 4.8,
    vehicleType: 'Kia Optima',
    priceJod: 7.0,
    departureTime: '14:00',
    seatsAvailable: 1,
    verified: true,
    instantBook: true,
    from: 'Amman',
    to: 'Irbid',
    distance: '85 km',
  },
];

type SortOption = 'price' | 'rating' | 'time' | 'seats';

const AdvancedSearchScreen = React.memo(function AdvancedSearchScreen() {
  const [from, setFrom] = useState('Amman');
  const [to, setTo] = useState('Irbid');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 20]);
  const [minRating, setMinRating] = useState(4.0);
  const [minSeats, setMinSeats] = useState(1);
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [instantBookOnly, setInstantBookOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('price');
  const [showFilters, setShowFilters] = useState(false);

  const filteredRides = useMemo(() => {
    let result = MOCK_RIDES.filter(
      ride =>
        ride.priceJod >= priceRange[0] &&
        ride.priceJod <= priceRange[1] &&
        ride.rating >= minRating &&
        ride.seatsAvailable >= minSeats &&
        (!verifiedOnly || ride.verified) &&
        (!instantBookOnly || ride.instantBook),
    );

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return a.priceJod - b.priceJod;
        case 'rating':
          return b.rating - a.rating;
        case 'time':
          return a.departureTime.localeCompare(b.departureTime);
        case 'seats':
          return b.seatsAvailable - a.seatsAvailable;
        default:
          return 0;
      }
    });

    return result;
  }, [priceRange, minRating, minSeats, verifiedOnly, instantBookOnly, sortBy]);

  const activeFiltersCount = [
    verifiedOnly,
    instantBookOnly,
    minRating > 4.0,
    minSeats > 1,
    priceRange[0] > 0 || priceRange[1] < 20,
  ].filter(Boolean).length;

  const handleDateChange = useCallback((event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  }, []);

  const clearFilters = useCallback(() => {
    setPriceRange([0, 20]);
    setMinRating(4.0);
    setMinSeats(1);
    setVerifiedOnly(false);
    setInstantBookOnly(false);
  }, []);

  return (
    <ScreenShell testID="advanced-search-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.statusRow}>
          <StatusPill
            label={`${filteredRides.length} rides found`}
            tone={colors.green}
            icon="search"
          />
          <StatusPill
            label={`Sorted by ${sortBy}`}
            tone={colors.blue}
            icon="funnel"
          />
        </View>

        <SectionHeader
          eyebrow="Smart search"
          title="Find your perfect ride"
          body="Filter by price, rating, seats, and more to find the best match."
        />

        {/* Search Inputs */}
        <PremiumPanel>
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Ionicons name="location" size={18} color={colors.teal} />
              <TextInput
                placeholder="From"
                placeholderTextColor={colors.muted}
                style={styles.textInput}
                value={from}
                onChangeText={setFrom}
              />
            </View>
            <View style={styles.inputGroup}>
              <Ionicons name="navigate" size={18} color={colors.blue} />
              <TextInput
                placeholder="To"
                placeholderTextColor={colors.muted}
                style={styles.textInput}
                value={to}
                onChangeText={setTo}
              />
            </View>
            <Pressable
              style={styles.inputGroup}
              onPress={() => setShowDatePicker(true)}
              hitSlop={hitSlop}
            >
              <Ionicons name="calendar" size={18} color={colors.gold} />
              <Text style={styles.dateText}>
                {date.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.muted} style={{ marginLeft: 'auto' }} />
            </Pressable>
          </View>
        </PremiumPanel>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}

        {/* Filter Toggle */}
        <View style={styles.filterHeader}>
          <PrimaryButton
            label={showFilters ? 'Hide filters' : `Show filters${activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}`}
            icon={showFilters ? 'chevron-up' : 'funnel'}
            tone={activeFiltersCount > 0 ? colors.amber : colors.blue}
            onPress={() => setShowFilters(!showFilters)}
            testID="toggle-filters-button"
          />
          {activeFiltersCount > 0 && (
            <PrimaryButton
              label="Clear"
              icon="close"
              tone={colors.muted}
              onPress={clearFilters}
            />
          )}
        </View>

        {/* Filters Panel */}
        {showFilters && (
          <PremiumPanel style={styles.filtersPanel}>
            <SectionHeader
              eyebrow="Filters"
              title="Refine your search"
              body="Apply filters to narrow down results"
            />

            {/* Sort Options */}
            <Text style={styles.filterLabel}>Sort by</Text>
            <View style={styles.sortOptions}>
              {(['price', 'rating', 'time', 'seats'] as SortOption[]).map(option => (
                <Pressable
                  key={option}
                  style={[
                    styles.sortChip,
                    sortBy === option && styles.sortChipActive,
                  ]}
                  onPress={() => setSortBy(option)}
                >
                  <Text
                    style={[
                      styles.sortChipText,
                      sortBy === option && styles.sortChipTextActive,
                    ]}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Price Range */}
            <Text style={styles.filterLabel}>Price range: {priceRange[0]} - {priceRange[1]} JOD</Text>
            <View style={styles.priceButtons}>
              <PrimaryButton
                label="< 5 JOD"
                tone={priceRange[1] <= 5 ? colors.teal : colors.muted}
                onPress={() => setPriceRange([0, 5])}
              />
              <PrimaryButton
                label="5-10 JOD"
                tone={priceRange[0] >= 5 && priceRange[1] <= 10 ? colors.teal : colors.muted}
                onPress={() => setPriceRange([5, 10])}
              />
              <PrimaryButton
                label="Any"
                tone={priceRange[0] === 0 && priceRange[1] === 20 ? colors.teal : colors.muted}
                onPress={() => setPriceRange([0, 20])}
              />
            </View>

            {/* Min Rating */}
            <Text style={styles.filterLabel}>Minimum rating: {minRating.toFixed(1)} ⭐</Text>
            <View style={styles.ratingButtons}>
              {[4.0, 4.5, 4.7, 4.9].map(rating => (
                <Pressable
                  key={rating}
                  style={[
                    styles.ratingChip,
                    minRating === rating && styles.ratingChipActive,
                  ]}
                  onPress={() => setMinRating(rating)}
                >
                  <Text
                    style={[
                      styles.ratingChipText,
                      minRating === rating && styles.ratingChipTextActive,
                    ]}
                  >
                    {rating}+
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Min Seats */}
            <Text style={styles.filterLabel}>Minimum seats: {minSeats}</Text>
            <View style={styles.seatsButtons}>
              {[1, 2, 3, 4].map(seats => (
                <Pressable
                  key={seats}
                  style={[
                    styles.seatsChip,
                    minSeats === seats && styles.seatsChipActive,
                  ]}
                  onPress={() => setMinSeats(seats)}
                >
                  <Text
                    style={[
                      styles.seatsChipText,
                      minSeats === seats && styles.seatsChipTextActive,
                    ]}
                  >
                    {seats}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Toggle Filters */}
            <View style={styles.toggles}>
              <FilterToggle
                label="Verified drivers only"
                active={verifiedOnly}
                onToggle={() => setVerifiedOnly(!verifiedOnly)}
                icon="shield-checkmark"
              />
              <FilterToggle
                label="Instant booking only"
                active={instantBookOnly}
                onToggle={() => setInstantBookOnly(!instantBookOnly)}
                icon="flash"
              />
            </View>
          </PremiumPanel>
        )}

        {/* Results */}
        <View style={styles.metrics}>
          <MetricTile label="Available" value={String(filteredRides.length)} tone={colors.teal} />
          <MetricTile label="Avg price" value={`${(filteredRides.reduce((sum, r) => sum + r.priceJod, 0) / filteredRides.length || 0).toFixed(1)} JOD`} tone={colors.gold} />
        </View>

        {filteredRides.length === 0 ? (
          <StateNotice
            icon="search"
            title="No rides found"
            body="Try adjusting your filters or search criteria"
            tone={colors.amber}
          />
        ) : (
          filteredRides.map(ride => (
            <RideCard key={ride.id} ride={ride} />
          ))
        )}

        <InfoCard
          icon="flash"
          title="Instant booking"
          body="Rides with instant booking are confirmed immediately without waiting for driver approval."
          tone={colors.blue}
        />
      </ScrollView>
    </ScreenShell>
  );
});

function RideCard({ ride }: { ride: RideOption }) {
  return (
    <PremiumPanel style={styles.rideCard}>
      <View style={styles.rideHeader}>
        <View style={styles.driverInfo}>
          <View style={styles.driverAvatar}>
            <Text style={styles.driverAvatarText}>
              {ride.driverName.split(' ')[0][0]}
            </Text>
          </View>
          <View style={styles.driverMeta}>
            <View style={styles.driverNameRow}>
              <Text style={styles.driverName}>{ride.driverName}</Text>
              {ride.verified && (
                <Ionicons name="shield-checkmark" size={14} color={colors.green} />
              )}
            </View>
            <Text style={styles.vehicleType}>{ride.vehicleType}</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color={colors.gold} />
              <Text style={styles.ratingText}>{ride.rating.toFixed(1)}</Text>
            </View>
          </View>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>{ride.priceJod} JOD</Text>
          {ride.instantBook && (
            <View style={styles.instantBadge}>
              <Ionicons name="flash" size={10} color={colors.blue} />
              <Text style={styles.instantText}>Instant</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.rideDetails}>
        <View style={styles.rideDetail}>
          <Ionicons name="time" size={14} color={colors.muted} />
          <Text style={styles.rideDetailText}>{ride.departureTime}</Text>
        </View>
        <View style={styles.rideDetail}>
          <Ionicons name="person" size={14} color={colors.muted} />
          <Text style={styles.rideDetailText}>{ride.seatsAvailable} seats</Text>
        </View>
        <View style={styles.rideDetail}>
          <Ionicons name="navigate" size={14} color={colors.muted} />
          <Text style={styles.rideDetailText}>{ride.distance}</Text>
        </View>
      </View>

      <PrimaryButton
        label="Book this ride"
        icon="checkmark"
        tone={colors.teal}
        testID={`book-ride-${ride.id}`}
      />
    </PremiumPanel>
  );
}

function FilterToggle({
  label,
  active,
  onToggle,
  icon,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      style={[styles.toggleRow, active && styles.toggleRowActive]}
      onPress={onToggle}
      hitSlop={hitSlop}
    >
      <Ionicons name={icon} size={18} color={active ? colors.teal : colors.muted} />
      <Text style={[styles.toggleLabel, active && styles.toggleLabelActive]}>
        {label}
      </Text>
      <View style={[styles.toggle, active && styles.toggleActive]}>
        {active && <View style={styles.toggleKnob} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  form: {
    gap: spacing.sm,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing.md,
    minHeight: 54,
  },
  textInput: {
    flex: 1,
    color: colors.ink,
    fontSize: typography.body,
    fontWeight: '700',
  },
  dateText: {
    flex: 1,
    color: colors.ink,
    fontSize: typography.body,
    fontWeight: '700',
  },
  filterHeader: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  filtersPanel: {
    gap: spacing.md,
  },
  filterLabel: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  sortOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sortChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.line,
  },
  sortChipActive: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  sortChipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  sortChipTextActive: {
    color: '#FFFFFF',
  },
  priceButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  ratingButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  ratingChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.line,
    minWidth: 60,
    alignItems: 'center',
  },
  ratingChipActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  ratingChipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  ratingChipTextActive: {
    color: '#FFFFFF',
  },
  seatsButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  seatsChip: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatsChipActive: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  seatsChipText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '900',
  },
  seatsChipTextActive: {
    color: '#FFFFFF',
  },
  toggles: {
    gap: spacing.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  toggleRowActive: {
    backgroundColor: `${colors.teal}12`,
    borderColor: colors.teal,
  },
  toggleLabel: {
    flex: 1,
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
  },
  toggleLabelActive: {
    color: colors.teal,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.line,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: colors.teal,
    alignItems: 'flex-end',
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    ...shadows.card,
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rideCard: {
    gap: spacing.md,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  driverInfo: {
    flexDirection: 'row',
    gap: spacing.sm,
    flex: 1,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  driverMeta: {
    flex: 1,
    gap: 3,
  },
  driverNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  driverName: {
    color: colors.ink,
    fontSize: typography.body,
    fontWeight: '900',
  },
  vehicleType: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '900',
  },
  priceContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  price: {
    color: colors.ink,
    fontSize: typography.title,
    fontWeight: '900',
  },
  instantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: `${colors.blue}18`,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  instantText: {
    color: colors.blue,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  rideDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  rideDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rideDetailText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
});

export default AdvancedSearchScreen;

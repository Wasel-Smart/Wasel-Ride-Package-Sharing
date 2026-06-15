import React, { useMemo, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  InfoCard,
  PremiumPanel,
  ScreenShell,
  SectionHeader,
  StateNotice,
  StatusPill,
} from '../components/MobilePrimitives';
import { colors, radii, spacing, typography } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_WIDTH = SCREEN_WIDTH - spacing.lg * 2;
const MAP_HEIGHT = 380;

type CityId = 'amman' | 'irbid' | 'zarqa' | 'aqaba' | 'salt' | 'karak' | 'mafraq' | 'jerash' | 'madaba' | 'ramtha';

interface CityNode {
  id: CityId;
  name: string;
  shortName: string;
  x: number;
  y: number;
  isCapital: boolean;
  population: string;
  region: 'north' | 'central' | 'south';
}

interface Corridor {
  id: string;
  from: CityId;
  to: CityId;
  rides: number;
  packages: number;
  avgPrice: number;
  avgDuration: string;
  demand: 'high' | 'medium' | 'low';
}

interface FlowParticle {
  id: string;
  from: CityId;
  to: CityId;
  type: 'ride' | 'package';
  progress: number;
  speed: number;
}

const CITIES: CityNode[] = [
  { id: 'amman', name: 'Amman', shortName: 'AMM', x: 0.52, y: 0.28, isCapital: true, population: '4M', region: 'central' },
  { id: 'irbid', name: 'Irbid', shortName: 'IRB', x: 0.68, y: 0.12, isCapital: false, population: '750K', region: 'north' },
  { id: 'zarqa', name: 'Zarqa', shortName: 'ZAR', x: 0.62, y: 0.38, isCapital: false, population: '550K', region: 'central' },
  { id: 'aqaba', name: 'Aqaba', shortName: 'AQJ', x: 0.82, y: 0.88, isCapital: false, population: '150K', region: 'south' },
  { id: 'salt', name: 'As-Salt', shortName: 'SLT', x: 0.44, y: 0.32, isCapital: false, population: '100K', region: 'central' },
  { id: 'karak', name: 'Al-Karak', shortName: 'KRK', x: 0.38, y: 0.58, isCapital: false, population: '80K', region: 'south' },
  { id: 'mafraq', name: 'Mafraq', shortName: 'MFR', x: 0.78, y: 0.22, isCapital: false, population: '70K', region: 'north' },
  { id: 'jerash', name: 'Jerash', shortName: 'JRS', x: 0.60, y: 0.16, isCapital: false, population: '50K', region: 'north' },
  { id: 'madaba', name: 'Madaba', shortName: 'MDB', x: 0.46, y: 0.42, isCapital: false, population: '60K', region: 'central' },
  { id: 'ramtha', name: 'Ar-Ramtha', shortName: 'RMT', x: 0.72, y: 0.08, isCapital: false, population: '90K', region: 'north' },
];

const CORRIDORS: Corridor[] = [
  { id: 'c1', from: 'amman', to: 'irbid', rides: 1240, packages: 340, avgPrice: 5.5, avgDuration: '1h 15m', demand: 'high' },
  { id: 'c2', from: 'amman', to: 'aqaba', rides: 890, packages: 520, avgPrice: 18.0, avgDuration: '3h 30m', demand: 'high' },
  { id: 'c3', from: 'amman', to: 'zarqa', rides: 2100, packages: 180, avgPrice: 3.0, avgDuration: '30m', demand: 'high' },
  { id: 'c4', from: 'amman', to: 'salt', rides: 680, packages: 120, avgPrice: 2.5, avgDuration: '25m', demand: 'medium' },
  { id: 'c5', from: 'amman', to: 'karak', rides: 450, packages: 90, avgPrice: 6.5, avgDuration: '1h', demand: 'medium' },
  { id: 'c6', from: 'irbid', to: 'jerash', rides: 320, packages: 80, avgPrice: 3.5, avgDuration: '40m', demand: 'medium' },
  { id: 'c7', from: 'irbid', to: 'mafraq', rides: 280, packages: 60, avgPrice: 4.0, avgDuration: '45m', demand: 'low' },
  { id: 'c8', from: 'amman', to: 'madaba', rides: 520, packages: 150, avgPrice: 4.0, avgDuration: '35m', demand: 'medium' },
  { id: 'c9', from: 'irbid', to: 'ramtha', rides: 390, packages: 45, avgPrice: 2.0, avgDuration: '20m', demand: 'low' },
  { id: 'c10', from: 'salt', to: 'zarqa', rides: 210, packages: 70, avgPrice: 3.5, avgDuration: '30m', demand: 'low' },
  { id: 'c11', from: 'karak', to: 'aqaba', rides: 180, packages: 200, avgPrice: 8.0, avgDuration: '1h 45m', demand: 'medium' },
  { id: 'c12', from: 'amman', to: 'jerash', rides: 610, packages: 110, avgPrice: 4.5, avgDuration: '50m', demand: 'medium' },
];

const TOTAL_RIDES = CORRIDORS.reduce((sum, c) => sum + c.rides, 0);
const TOTAL_PACKAGES = CORRIDORS.reduce((sum, c) => sum + c.packages, 0);
const ACTIVE_CORRIDORS = CORRIDORS.filter(c => c.demand === 'high').length;

function MapScreen() {
  const [selectedCity, setSelectedCity] = useState<CityId | null>(null);
  const [hoveredCorridor, setHoveredCorridor] = useState<string | null>(null);
  const [flowParticles, setFlowParticles] = useState<FlowParticle[]>([]);

  const cityMap = useMemo(() => {
    const map: Record<CityId, CityNode> = {};
    CITIES.forEach(city => { map[city.id] = city; });
    return map;
  }, []);

  const corridorMap = useMemo(() => {
    const map: Record<string, Corridor> = {};
    CORRIDORS.forEach(c => { map[c.id] = c; });
    return map;
  }, []);

  const selectedCorridors = useMemo(() => {
    if (!selectedCity) return CORRIDORS;
    return CORRIDORS.filter(c => c.from === selectedCity || c.to === selectedCity);
  }, [selectedCity]);

  const selectedCityData = selectedCity ? cityMap[selectedCity] : null;

  const getCorridorPath = (corridor: Corridor): { x1: number; y1: number; x2: number; y2: number } => {
    const fromCity = cityMap[corridor.from];
    const toCity = cityMap[corridor.to];
    return {
      x1: fromCity.x * MAP_WIDTH,
      y1: fromCity.y * MAP_HEIGHT,
      x2: toCity.x * MAP_WIDTH,
      y2: toCity.y * MAP_HEIGHT,
    };
  };

  const getDemandColor = (demand: Corridor['demand']): string => {
    switch (demand) {
      case 'high':
        return colors.teal;
      case 'medium':
        return colors.blue;
      case 'low':
        return colors.muted;
    }
  };

  const getRegionColor = (region: CityNode['region']): string => {
    switch (region) {
      case 'north':
        return colors.blue;
      case 'central':
        return colors.teal;
      case 'south':
        return colors.gold;
    }
  };

  return (
    <ScreenShell testID="map-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <SectionHeader
          eyebrow="Mobility OS"
          title="Jordan Network Map"
          body="Live rides and packages flowing between cities in real-time."
        />

        <View style={styles.globalStats}>
          <View style={[styles.statPill, { backgroundColor: `${colors.teal}14` }]}>
            <Text style={[styles.statValue, { color: colors.teal }]}>{TOTAL_RIDES.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Rides</Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: `${colors.blue}14` }]}>
            <Text style={[styles.statValue, { color: colors.blue }]}>{TOTAL_PACKAGES.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Packages</Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: `${colors.gold}14` }]}>
            <Text style={[styles.statValue, { color: colors.gold }]}>{ACTIVE_CORRIDORS}</Text>
            <Text style={styles.statLabel}>Hot Routes</Text>
          </View>
        </View>

        <PremiumPanel tone="dark" style={styles.mapContainer}>
          <View style={styles.mapHeader}>
            <Text style={styles.mapTitle}>National Transit Network</Text>
            <StatusPill
              label={selectedCity ? `Filtered: ${selectedCityData?.name}` : 'All cities'}
              tone={selectedCity ? colors.cyan : colors.green}
              icon={selectedCity ? 'location' : 'globe'}
            />
          </View>

          <View style={styles.mapFrame}>
            <View style={styles.mapInner}>
              {CORRIDORS.map(corridor => {
                const path = getCorridorPath(corridor);
                const isHighlighted = hoveredCorridor === corridor.id;
                const isDimmed = hoveredCorridor !== null && !isHighlighted;
                const demandColor = getDemandColor(corridor.demand);
                const midX = (path.x1 + path.x2) / 2;
                const midY = (path.y1 + path.y2) / 2 - 10;

                return (
                  <React.Fragment key={corridor.id}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.corridorPressable,
                        {
                          left: Math.min(path.x1, path.x2),
                          top: Math.min(path.y1, path.y2),
                          width: Math.abs(path.x2 - path.x1) || 1,
                          height: Math.abs(path.y2 - path.y1) || 1,
                          opacity: isDimmed ? 0.15 : 1,
                        },
                        pressed && styles.corridorPressed,
                      ]}
                      onPressIn={() => setHoveredCorridor(corridor.id)}
                      onPressOut={() => setHoveredCorridor(null)}
                      testID={`corridor-${corridor.id}`}
                    >
                      <View
                        style={[
                          styles.corridorLine,
                          {
                            backgroundColor: demandColor,
                            opacity: isHighlighted ? 1 : 0.5,
                            transform: [
                              { rotate: `${Math.atan2(path.y2 - path.y1, path.x2 - path.x1)}rad` },
                            ],
                          },
                        ]}
                      />
                      <View
                        style={[
                          styles.corridorLabel,
                          { left: midX, top: midY },
                          isHighlighted && styles.corridorLabelActive,
                        ]}
                      >
                        <Text style={[styles.corridorPrice, { color: demandColor }]}>
                          JOD {corridor.avgPrice}
                        </Text>
                        <Text style={styles.corridorDuration}>{corridor.avgDuration}</Text>
                      </View>
                    </Pressable>
                  </React.Fragment>
                );
              })}

              {CITIES.map(city => {
                const isSelected = selectedCity === city.id;
                const isRelatedToHover = hoveredCorridor
                  ? CORRIDORS.find(c => c.id === hoveredCorridor)?.from === city.id
                    || CORRIDORS.find(c => c.id === hoveredCorridor)?.to === city.id
                  : true;
                const regionColor = getRegionColor(city.region);

                return (
                  <Pressable
                    key={city.id}
                    style={({ pressed }) => [
                      styles.cityNode,
                      {
                        left: city.x * MAP_WIDTH - 28,
                        top: city.y * MAP_HEIGHT - 28,
                        opacity: isRelatedToHover ? 1 : 0.25,
                      },
                      pressed && styles.cityPressed,
                      isSelected && { transform: [{ scale: 1.15 }] },
                    ]}
                    onPress={() => setSelectedCity(isSelected ? null : city.id)}
                    testID={`city-${city.id}`}
                  >
                    <View
                      style={[
                        styles.cityDot,
                        {
                          backgroundColor: city.isCapital ? colors.navy : colors.surface,
                          borderColor: regionColor,
                          shadowColor: regionColor,
                        },
                        isSelected && { borderColor: colors.cyan, borderWidth: 3 },
                      ]}
                    >
                      {city.isCapital && <Text style={styles.capitalStar}>★</Text>}
                    </View>
                    <View style={styles.cityLabelGroup}>
                      <Text
                        style={[
                          styles.cityShortName,
                          { color: isSelected ? colors.cyan : colors.ink },
                          isSelected && { fontWeight: '900' },
                        ]}
                      >
                        {city.shortName}
                      </Text>
                      <Text
                        style={[
                          styles.cityFullName,
                          { color: colors.muted },
                        ]}
                      >
                        {city.name}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.cityPopBadge,
                        { backgroundColor: `${regionColor}18` },
                      ]}
                    >
                      <Text style={[styles.cityPop, { color: regionColor }]}>
                        {city.population}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.mapLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.teal }]} />
              <Text style={styles.legendText}>High demand</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.blue }]} />
              <Text style={styles.legendText}>Medium</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.muted }]} />
              <Text style={styles.legendText}>Low</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.gold, borderWidth: 2, borderColor: colors.gold }]} />
              <Text style={styles.legendText}>Capital</Text>
            </View>
          </View>
        </PremiumPanel>

        {selectedCityData && (
          <View style={styles.cityDetailPanel}>
            <View style={styles.cityDetailHeader}>
              <Text style={styles.cityDetailTitle}>{selectedCityData.name}</Text>
              <View style={[styles.regionBadge, { backgroundColor: `${getRegionColor(selectedCityData.region)}18` }]}>
                <Text style={[styles.regionBadgeText, { color: getRegionColor(selectedCityData.region) }]}>
                  {selectedCityData.region.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.cityMetrics}>
              <View style={styles.cityMetric}>
                <Text style={styles.cityMetricValue}>
                  {selectedCorridors.reduce((sum, c) => sum + c.rides, 0).toLocaleString()}
                </Text>
                <Text style={styles.cityMetricLabel}>Rides</Text>
              </View>
              <View style={styles.cityMetric}>
                <Text style={styles.cityMetricValue}>
                  {selectedCorridors.reduce((sum, c) => sum + c.packages, 0).toLocaleString()}
                </Text>
                <Text style={styles.cityMetricLabel}>Packages</Text>
              </View>
              <View style={styles.cityMetric}>
                <Text style={styles.cityMetricValue}>{selectedCityData.population}</Text>
                <Text style={styles.cityMetricLabel}>Population</Text>
              </View>
            </View>

            <Text style={styles.cityDetailSection}>Active Corridors</Text>
            {selectedCorridors
              .filter(c => c.from === selectedCity || c.to === selectedCity)
              .map(corridor => {
                const otherCity = cityMap[corridor.from === selectedCity ? corridor.to : corridor.from];
                return (
                  <Pressable
                    key={corridor.id}
                    style={({ pressed }) => [
                      styles.corridorCard,
                      pressed && styles.corridorCardPressed,
                    ]}
                    onPressIn={() => setHoveredCorridor(corridor.id)}
                    onPressOut={() => setHoveredCorridor(null)}
                  >
                    <View style={styles.corridorCardLeft}>
                      <View style={[styles.corridorIndicator, { backgroundColor: getDemandColor(corridor.demand) }]} />
                      <View>
                        <Text style={styles.corridorRoute}>
                          {cityMap[corridor.from].shortName} → {cityMap[corridor.to].shortName}
                        </Text>
                        <Text style={styles.corridorCities}>
                          {cityMap[corridor.from].name} ↔ {otherCity.name}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.corridorCardRight}>
                      <View style={styles.corridorStats}>
                        <View style={styles.corridorStat}>
                          <Ionicons name="car" size={14} color={colors.teal} />
                          <Text style={styles.corridorStatText}>{corridor.rides}</Text>
                        </View>
                        <View style={styles.corridorStat}>
                          <Ionicons name="cube" size={14} color={colors.blue} />
                          <Text style={styles.corridorStatText}>{corridor.packages}</Text>
                        </View>
                      </View>
                      <Text style={[styles.corridorPrice, { color: getDemandColor(corridor.demand) }]}>
                        JOD {corridor.avgPrice}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
          </View>
        )}

        {!selectedCityData && (
          <View style={styles.topCorridors}>
            <SectionHeader
              eyebrow="Busiest routes"
              title="Top corridors"
              body="Highest demand routes across Jordan"
            />
            {CORRIDORS
              .filter(c => c.demand === 'high')
              .sort((a, b) => (b.rides + b.packages) - (a.rides + a.packages))
              .slice(0, 5)
              .map(corridor => (
                <Pressable
                  key={corridor.id}
                  style={({ pressed }) => [
                    styles.topCorridorCard,
                    pressed && styles.topCorridorCardPressed,
                  ]}
                  onPress={() => setSelectedCity(corridor.from)}
                >
                  <View style={[styles.topCorridorDot, { backgroundColor: colors.teal }]} />
                  <View style={styles.topCorridorInfo}>
                    <Text style={styles.topCorridorRoute}>
                      {cityMap[corridor.from].name} → {cityMap[corridor.to].name}
                    </Text>
                    <Text style={styles.topCorridorMeta}>
                      {corridor.rides} rides · {corridor.packages} packages · {corridor.avgDuration}
                    </Text>
                  </View>
                  <View style={styles.topCorridorRight}>
                    <Text style={[styles.topCorridorPrice, { color: colors.teal }]}>JOD {corridor.avgPrice}</Text>
                    <StatusPill label={corridor.demand} tone={colors.teal} icon="flash" />
                  </View>
                </Pressable>
              ))}
          </View>
        )}

        <InfoCard
          icon="git-network"
          title="Pan-Jordan network"
          body="Rides and packages connect all 10 major cities. Tap any city or corridor to explore demand, pricing, and duration."
          tone={colors.cyan}
        />
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.lg, paddingBottom: spacing.xxl },
  globalStats: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statPill: {
    flex: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.lead,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: typography.micro,
    fontWeight: '800',
    color: colors.muted,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  mapContainer: {
    padding: spacing.lg,
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  mapTitle: {
    fontSize: typography.body,
    fontWeight: '900',
    color: colors.ink,
  },
  mapFrame: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: '#0B1220',
    borderWidth: 1,
    borderColor: '#213047',
  },
  mapInner: {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    position: 'relative',
  },
  corridorPressable: {
    position: 'absolute',
  },
  corridorLine: {
    position: 'absolute',
    height: 2,
    width: '100%',
    borderRadius: 1,
  },
  corridorLabel: {
    position: 'absolute',
    transform: [{ translateX: -30 }],
    alignItems: 'center',
    gap: 2,
  },
  corridorLabelActive: {
    transform: [{ translateX: -30 }, { scale: 1.1 }],
  },
  corridorPrice: {
    fontSize: 11,
    fontWeight: '900',
  },
  corridorDuration: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.muted,
  },
  cityNode: {
    position: 'absolute',
    alignItems: 'center',
    gap: 4,
    zIndex: 10,
  },
  cityPressed: {
    opacity: 0.8,
  },
  cityDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lift,
  },
  capitalStar: {
    fontSize: 14,
    color: colors.gold,
    fontWeight: '900',
  },
  cityLabelGroup: {
    alignItems: 'center',
    gap: 1,
  },
  cityShortName: {
    fontSize: typography.caption,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cityFullName: {
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    maxWidth: 70,
  },
  cityPopBadge: {
    borderRadius: radii.pill,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  cityPop: {
    fontSize: 8,
    fontWeight: '800',
  },
  mapLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.muted,
  },
  cityDetailPanel: {
    gap: spacing.md,
  },
  cityDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cityDetailTitle: {
    fontSize: typography.lead,
    fontWeight: '900',
    color: colors.ink,
  },
  regionBadge: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  regionBadgeText: {
    fontSize: typography.micro,
    fontWeight: '800',
    letterSpacing: 1,
  },
  cityMetrics: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cityMetric: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  cityMetricValue: {
    fontSize: typography.lead,
    fontWeight: '900',
    color: colors.teal,
  },
  cityMetricLabel: {
    fontSize: typography.micro,
    fontWeight: '800',
    color: colors.muted,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  cityDetailSection: {
    fontSize: typography.caption,
    fontWeight: '800',
    color: colors.muted,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  corridorCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
  },
  corridorCardPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  corridorCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  corridorIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  corridorRoute: {
    fontSize: typography.body,
    fontWeight: '800',
    color: colors.ink,
  },
  corridorCities: {
    fontSize: typography.micro,
    fontWeight: '700',
    color: colors.muted,
    marginTop: 2,
  },
  corridorCardRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  corridorStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  corridorStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  corridorStatText: {
    fontSize: typography.caption,
    fontWeight: '800',
    color: colors.text,
  },
  corridorPrice: {
    fontSize: typography.caption,
    fontWeight: '900',
  },
  topCorridors: {
    gap: spacing.md,
  },
  topCorridorCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  topCorridorCardPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  topCorridorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  topCorridorInfo: {
    flex: 1,
    gap: 2,
  },
  topCorridorRoute: {
    fontSize: typography.body,
    fontWeight: '800',
    color: colors.ink,
  },
  topCorridorMeta: {
    fontSize: typography.micro,
    fontWeight: '700',
    color: colors.muted,
  },
  topCorridorRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  topCorridorPrice: {
    fontSize: typography.body,
    fontWeight: '900',
  },
});

export default MapScreen;

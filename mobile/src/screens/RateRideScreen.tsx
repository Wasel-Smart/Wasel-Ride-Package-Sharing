import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  InfoCard,
  PremiumPanel,
  PrimaryButton,
  ScreenShell,
  SectionHeader,
  StateNotice,
  StatusPill,
} from '../components/MobilePrimitives';
import { rideLifecycle } from '../services/ride';
import { colors, spacing } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { Text, Pressable } from 'react-native';

type RootStackParamList = {
  Tabs: undefined;
  Safety: undefined;
  Trips: undefined;
  Bus: undefined;
  Driver: undefined;
  Notifications: undefined;
  RateRide: { rideId: string; driverName: string };
  Chat: { rideId: string; driverName: string };
  LiveTracking: { rideId: string };
  AdvancedSearch: undefined;
  SignIn: undefined;
};

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const STARS = [1, 2, 3, 4, 5];

const FEEDBACK_TAGS = [
  { id: 'safe', label: 'Safe driving', icon: 'shield-checkmark' as const },
  { id: 'punctual', label: 'On time', icon: 'time' as const },
  { id: 'clean', label: 'Clean vehicle', icon: 'sparkles' as const },
  { id: 'friendly', label: 'Friendly', icon: 'heart' as const },
  { id: 'quiet', label: 'Quiet ride', icon: 'volume-mute' as const },
  { id: 'music', label: 'Good music', icon: 'musical-notes' as const },
];

const RateRideScreen = React.memo(function RateRideScreen() {
  const route = useRoute();
  const navigation = useNavigation<NavProp>();
  const { rideId = '', driverName = '' } = (route.params as { rideId?: string; driverName?: string } | undefined) ?? {};

  const [rating, setRating] = useState(0);
  const [feedback] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  const toggleTag = useCallback((id: string) => {
    setSelectedTags(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const submitRating = useCallback(async () => {
    if (rating === 0) {
      Alert.alert('Select a rating', 'Please choose a star rating before submitting.');
      return;
    }
    setLoading(true);
    try {
      const fullFeedback = [
        ...Array.from(selectedTags).map(id => FEEDBACK_TAGS.find(t => t.id === id)?.label).filter(Boolean),
        feedback.trim(),
      ].filter(Boolean).join('. ');

      const { error } = await rideLifecycle.rateRide(rideId, rating, fullFeedback || undefined);
      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      Alert.alert('Rating error', err instanceof Error ? err.message : 'Could not submit rating. It has been queued for sync.');
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }, [rating, rideId, feedback, selectedTags]);

  if (submitted) {
    return (
      <ScreenShell testID="rate-ride-screen">
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <StateNotice
            icon="checkmark-circle"
            title="Rating submitted"
            body={`Thank you for rating ${driverName}. Your feedback helps keep Wasel safe.`}
            tone={colors.green}
            testID="rating-submitted"
          />
          <PrimaryButton
            label="Back to trips"
            icon="time"
            tone={colors.teal}
            onPress={() => navigation.navigate('Trips')}
          />
        </ScrollView>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      footer={
        <PrimaryButton
          label="Submit rating"
          icon="star"
          loading={loading}
          disabled={rating === 0}
          tone={colors.gold}
          onPress={submitRating}
          testID="submit-rating-button"
        />
      }
      testID="rate-ride-screen"
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <SectionHeader
          eyebrow="Rate your ride"
          title={`How was ${driverName}?`}
          body="Your rating helps other riders and keeps Wasel's trust layer strong."
        />

        <PremiumPanel tone="dark">
          <SectionHeader
            eyebrow="Star rating"
            title="Tap to rate"
            tone="dark"
          />
          <View style={styles.stars}>
            {STARS.map(star => (
              <Pressable key={star} onPress={() => setRating(star)} style={styles.starButton}>
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={40}
                  color={star <= rating ? colors.gold : '#94A3B8'}
                />
              </Pressable>
            ))}
          </View>
          {rating > 0 && (
            <StatusPill
              label={['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][rating]}
              tone={[colors.red, colors.red, colors.amber, colors.blue, colors.teal, colors.green][rating]}
              icon="star"
            />
          )}
        </PremiumPanel>

        <SectionHeader
          eyebrow="What stood out?"
          title="Quick feedback"
          body="Tap any that apply — drivers see this."
        />

        <View style={styles.tags}>
          {FEEDBACK_TAGS.map(tag => (
            <Pressable
              key={tag.id}
              onPress={() => toggleTag(tag.id)}
              style={[styles.tag, selectedTags.has(tag.id) && styles.tagActive]}
            >
              <Ionicons
                name={tag.icon}
                size={16}
                color={selectedTags.has(tag.id) ? '#FFFFFF' : colors.teal}
              />
              <Text style={[styles.tagText, selectedTags.has(tag.id) && styles.tagTextActive]}>
                {tag.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <InfoCard
          icon="shield-checkmark"
          title="Ratings are anonymous"
          body="Drivers see aggregate ratings and feedback tags. Your written comments are kept private."
          tone={colors.green}
        />
      </ScrollView>
    </ScreenShell>
  );
});

const styles = StyleSheet.create({
  scroll: { gap: spacing.lg, paddingBottom: spacing.xxl },
  stars: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', marginVertical: spacing.md },
  starButton: { padding: spacing.xs },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.teal,
    backgroundColor: `${colors.teal}12`,
  },
  tagActive: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  tagText: {
    color: colors.teal,
    fontSize: 13,
    fontWeight: '800',
  },
  tagTextActive: {
    color: '#FFFFFF',
  },
});

export default RateRideScreen;

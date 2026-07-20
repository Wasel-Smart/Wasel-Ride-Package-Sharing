import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View, Alert, Text, Pressable } from 'react-native';
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
import type { RootStackParamList } from '../navigation/types';

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
  const route = useRoute<RootStackParamList['RateRide']>();
  const navigation = useNavigation<NavProp>();
  const { rideId = '', driverName = '', driverId, tripId } = route.params ?? {};

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
      Alert.alert('اختر تقييم', 'اختار عدد النجوم قبل الإرسال.');
      return;
    }
    setLoading(true);
    try {
      const fullFeedback = [
        ...Array.from(selectedTags).map(id => FEEDBACK_TAGS.find(t => t.id === id)?.label).filter(Boolean),
        feedback.trim(),
      ].filter(Boolean).join('. ');

      const { error } = await rideLifecycle.rateRide(
        rideId,
        rating,
        fullFeedback || undefined,
        Array.from(selectedTags),
        driverId,
        tripId,
      );
      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      Alert.alert('خطأ بالتقييم', err instanceof Error ? err.message : 'ما قدرنا نرسل التقييم. انحفظ للمزامنة لاحقاً.');
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }, [rating, rideId, feedback, selectedTags, driverId, tripId]);

  if (submitted) {
    return (
      <ScreenShell testID="rate-ride-screen">
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <StateNotice
            icon="checkmark-circle"
            title="تم إرسال التقييم"
            body={`شكراً لتقييم ${driverName}. ملاحظتك بتساعد نخلي واصل آمن.`}
            tone={colors.green}
            testID="rating-submitted"
          />
          <PrimaryButton
            label="الرجوع للمشاوير"
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
          label="إرسال التقييم"
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
          eyebrow="قيّم مشوارك"
          title={`كيف كان ${driverName}؟`}
          body="Your rating helps other riders and keeps Wasel's trust layer strong."
        />

        <PremiumPanel tone="dark">
          <SectionHeader
            eyebrow="تقييم النجوم"
            title="اضغط للتقييم"
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
              label={['', 'ضعيف', 'مقبول', 'جيد', 'ممتاز', 'رائع'][rating]}
              tone={[colors.red, colors.red, colors.amber, colors.blue, colors.teal, colors.green][rating]}
              icon="star"
            />
          )}
        </PremiumPanel>

        <SectionHeader
          eyebrow="شو كان مميز؟"
          title="ملاحظات سريعة"
          body="اختار اللي بنطبق - السائق بشوفها."
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
          title="التقييمات بدون اسم"
          body="السائقون بشوفوا التقييمات المجمعة ووسوم الملاحظات. تعليقاتك المكتوبة بتضل خاصة."
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

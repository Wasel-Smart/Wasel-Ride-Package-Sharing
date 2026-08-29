import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { InfoCard, PremiumPanel, PrimaryButton, ScreenShell, SectionHeader, StateNotice, StatusPill } from '../components/MobilePrimitives';
import type { RootStackParamList } from '../navigation/types';
import { rideLifecycle } from '../services/ride';
import { colors, spacing } from '../theme';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
const STARS = [1, 2, 3, 4, 5];
const FEEDBACK_TAGS = [
  { id: 'safe', label: 'قيادة آمنة', icon: 'shield-checkmark' as const },
  { id: 'punctual', label: 'في الموعد', icon: 'time' as const },
  { id: 'clean', label: 'مركبة نظيفة', icon: 'sparkles' as const },
  { id: 'friendly', label: 'سائق ودود', icon: 'heart' as const },
  { id: 'quiet', label: 'رحلة هادئة', icon: 'volume-mute' as const },
  { id: 'music', label: 'موسيقى مناسبة', icon: 'musical-notes' as const },
];

const RateRideScreen = React.memo(function RateRideScreen() {
  const route = useRoute<RootStackParamList['RateRide']>();
  const navigation = useNavigation<NavProp>();
  const { rideId = '', driverName = '', driverId, tripId } = route.params ?? {};
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  const toggleTag = useCallback((id: string) => {
    setSelectedTags(previous => {
      const next = new Set(previous);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const submitRating = useCallback(async () => {
    if (rating === 0) { Alert.alert('اختر تقييماً', 'اختر عدد النجوم قبل الإرسال.'); return; }
    setLoading(true);
    setSubmissionError(null);
    try {
      const fullFeedback = Array.from(selectedTags).map(id => FEEDBACK_TAGS.find(tag => tag.id === id)?.label).filter(Boolean).join('. ');
      const { error } = await rideLifecycle.rateRide(rideId, rating, fullFeedback || undefined, Array.from(selectedTags), driverId, tripId);
      if (error) throw error;
      setSubmitted(true);
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'تعذر إرسال التقييم. حاول مرة أخرى.');
    } finally { setLoading(false); }
  }, [driverId, rating, rideId, selectedTags, tripId]);

  if (submitted) {
    return <ScreenShell testID="rate-ride-screen"><ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <StateNotice icon="checkmark-circle" title="تم إرسال التقييم" body={`شكراً لتقييم ${driverName}. ملاحظتك تساعدنا على إبقاء واصل آمناً.`} tone={colors.green} testID="rating-submitted" />
      <PrimaryButton label="الرجوع للمشاوير" icon="time" tone={colors.teal} onPress={() => navigation.navigate('Trips')} />
    </ScrollView></ScreenShell>;
  }

  return (
    <ScreenShell footer={<PrimaryButton label="إرسال التقييم" icon="star" loading={loading} disabled={rating === 0} tone={colors.gold} onPress={submitRating} testID="submit-rating-button" />} testID="rate-ride-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <SectionHeader eyebrow="قيّم مشوارك" title={`كيف كانت رحلتك مع ${driverName}؟`} body="تقييمك يساعد الركاب الآخرين ويحافظ على موثوقية واصل." />
        <PremiumPanel tone="dark">
          <SectionHeader eyebrow="تقييم النجوم" title="اضغط للتقييم" tone="dark" />
          <View style={styles.stars}>{STARS.map(star => <Pressable accessibilityLabel={`${star} من 5 نجوم`} accessibilityRole="button" accessibilityState={{ selected: star === rating }} key={star} onPress={() => setRating(star)} style={styles.starButton} testID={`rating-star-${star}`}>
            <Ionicons name={star <= rating ? 'star' : 'star-outline'} size={40} color={star <= rating ? colors.gold : 'rgba(196,220,238,0.35)'} />
          </Pressable>)}</View>
          {rating > 0 ? <StatusPill label={['', 'ضعيف', 'مقبول', 'جيد', 'ممتاز', 'رائع'][rating]} tone={[colors.red, colors.red, colors.amber, colors.blue, colors.teal, colors.green][rating]} icon="star" /> : null}
        </PremiumPanel>
        <SectionHeader eyebrow="ما الذي كان مميزاً؟" title="ملاحظات سريعة" body="اختر ما ينطبق؛ يراه السائق ضمن ملخص التقييم." />
        <View style={styles.tags}>{FEEDBACK_TAGS.map(tag => <Pressable accessibilityLabel={tag.label} accessibilityRole="checkbox" accessibilityState={{ checked: selectedTags.has(tag.id) }} key={tag.id} onPress={() => toggleTag(tag.id)} style={[styles.tag, selectedTags.has(tag.id) && styles.tagActive]} testID={`rating-tag-${tag.id}`}>
          <Ionicons name={tag.icon} size={16} color={selectedTags.has(tag.id) ? '#FFFFFF' : colors.teal} />
          <Text style={[styles.tagText, selectedTags.has(tag.id) && styles.tagTextActive]}>{tag.label}</Text>
        </Pressable>)}</View>
        <InfoCard icon="shield-checkmark" title="التقييمات بدون اسم" body="يرى السائقون ملخصات التقييم والوسوم. تبقى ملاحظاتك المكتوبة خاصة." tone={colors.green} />
        {submissionError ? <StateNotice icon="alert-circle" title="تعذر إرسال التقييم" body={submissionError} tone={colors.red} testID="rating-error" /> : null}
      </ScrollView>
    </ScreenShell>
  );
});

const styles = StyleSheet.create({
  scroll: { gap: spacing.lg, paddingBottom: spacing.xxl },
  stars: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', marginVertical: spacing.md },
  starButton: { minHeight: 44, minWidth: 44, padding: spacing.xs },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: { alignItems: 'center', backgroundColor: `${colors.teal}12`, borderColor: colors.teal, borderRadius: 999, borderWidth: 1, flexDirection: 'row', gap: 6, minHeight: 44, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  tagActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  tagText: { color: colors.teal, fontSize: 13, fontWeight: '800' },
  tagTextActive: { color: '#FFFFFF' },
});

export default RateRideScreen;

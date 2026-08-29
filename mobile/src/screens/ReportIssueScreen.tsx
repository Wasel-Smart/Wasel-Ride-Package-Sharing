import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenShell } from '../components/MobilePrimitives';
import type { RootStackParamList } from '../navigation/types';
import { offlineService } from '../services/offline';
import { mobileAuth } from '../services/auth';
import { colors, spacing, typography } from '../theme';

const ALLOWED_API_DOMAINS = ['supabase.co', 'supabase.net', 'wasel14.online', 'localhost'];

function isValidApiUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    if (parsed.hostname === 'localhost') return true;
    const privateRanges = [/^127\./, /^10\./, /^172\.(1[6-9]|2[0-9]|3[01])\./, /^192\.168\./, /^169\.254\./];
    if (privateRanges.some(p => p.test(parsed.hostname))) return false;
    return ALLOWED_API_DOMAINS.some(d => parsed.hostname.endsWith(d));
  } catch {
    return false;
  }
}

type NavProp = NativeStackNavigationProp<RootStackParamList>;
interface ReportIssueProps { route: { params?: Partial<RootStackParamList['ReportIssue']> }; navigation: NavProp; }

const ISSUES = ['تأخر السائق', 'تم احتساب أجرة غير صحيحة', 'تصرف السائق لم يكن مهنياً', 'حالة المركبة سيئة', 'ملاحظة أمان', 'أخرى'];

export default function ReportIssueScreen({ route, navigation }: ReportIssueProps) {
  const { rideId } = (route.params as { rideId?: string }) || {};
  const [selectedIssue, setSelectedIssue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [description, setDescription] = useState('');

  const handleSubmit = async () => {
    if (!selectedIssue) { Alert.alert('اختر المشكلة', 'يرجى اختيار نوع المشكلة قبل الإرسال.'); return; }
    setIsSubmitting(true);
    const payload = { bookingId: rideId, issueType: selectedIssue, description: description.trim() };
    try {
      if (!offlineService.isDeviceOnline()) {
        await offlineService.queueOfflineAction({ type: 'ISSUE_REPORT', payload });
      } else {
        const baseUrl = process.env.EXPO_PUBLIC_API_URL;
        if (!baseUrl) throw new Error('خدمة الإبلاغ غير مهيأة حالياً.');
        const fetchUrl = `${baseUrl.replace(/\/$/, '')}/reports`;
        if (!isValidApiUrl(fetchUrl)) {
          throw new Error('Invalid or unauthorized API URL');
        }
        const token = mobileAuth.getAccessToken?.() ?? undefined;
        const response = await fetch(fetchUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error('تعذر إرسال البلاغ. حاول مرة أخرى.');
      }
      Alert.alert('تم إرسال البلاغ', 'شكراً لملاحظتك. سيُراجع فريق الدعم البلاغ قريباً.', [{ text: 'حسناً', onPress: () => navigation.goBack() }]);
    } catch (error) {
      Alert.alert('تعذر إرسال البلاغ', error instanceof Error ? error.message : 'حاول مرة أخرى عند عودة الاتصال.');
    } finally { setIsSubmitting(false); }
  };

  return (
    <ScreenShell testID="report-issue-screen">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>بلّغ عن مشكلة</Text>
        <Text style={styles.subtitle}>ساعدنا على تحسين تجربتك وسلامة كل رحلة.</Text>
        {rideId ? <View style={styles.rideInfo}><Text style={styles.rideLabel}>رقم المشوار</Text><Text style={styles.rideValue}>{rideId}</Text></View> : null}
        <Text style={styles.sectionTitle}>ما الذي حدث؟</Text>
        {ISSUES.map((issue, index) => {
          const selected = selectedIssue === issue;
          return <TouchableOpacity accessibilityLabel={issue} accessibilityRole="radio" accessibilityState={{ selected }} key={issue} onPress={() => setSelectedIssue(issue)} style={[styles.issueItem, selected && styles.issueItemSelected]} testID={`issue-${index}`}>
            <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={selected ? colors.green : colors.muted} />
            <Text style={[styles.issueText, selected && styles.issueTextSelected]}>{issue}</Text>
          </TouchableOpacity>;
        })}
        <Text style={styles.sectionTitle}>تفاصيل إضافية (اختياري)</Text>
        <TextInput accessibilityLabel="تفاصيل المشكلة" multiline numberOfLines={6} onChangeText={setDescription} placeholder="اكتب تفاصيل تساعد فريق الدعم على المتابعة..." placeholderTextColor={colors.muted} style={styles.textArea} testID="issue-description-input" textAlignVertical="top" value={description} />
        <TouchableOpacity accessibilityLabel="إرسال البلاغ" accessibilityRole="button" disabled={isSubmitting} onPress={() => void handleSubmit()} style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} testID="submit-issue-button">
          {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>إرسال البلاغ</Text>}
        </TouchableOpacity>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl },
  title: { color: colors.ink, ...typography.title, fontWeight: '900' },
  subtitle: { color: colors.muted, ...typography.body, marginTop: spacing.xs },
  rideInfo: { alignItems: 'center', backgroundColor: `${colors.teal}12`, borderColor: `${colors.teal}35`, borderRadius: 12, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg, padding: spacing.md },
  rideLabel: { color: colors.muted, ...typography.caption, fontWeight: '800' },
  rideValue: { color: colors.ink, ...typography.caption, fontWeight: '800' },
  sectionTitle: { color: colors.ink, ...typography.body, fontWeight: '900', marginBottom: spacing.sm, marginTop: spacing.lg },
  issueItem: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 12, borderWidth: 1, flexDirection: 'row', marginBottom: spacing.sm, minHeight: 56, paddingHorizontal: spacing.md },
  issueItemSelected: { backgroundColor: `${colors.green}10`, borderColor: colors.green },
  issueText: { color: colors.ink, flex: 1, ...typography.body, fontWeight: '700', marginLeft: spacing.sm },
  issueTextSelected: { color: colors.green },
  textArea: { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 12, borderWidth: 1, color: colors.ink, ...typography.body, minHeight: 140, padding: spacing.md },
  submitButton: { alignItems: 'center', backgroundColor: colors.teal, borderRadius: 12, justifyContent: 'center', marginTop: spacing.xl, minHeight: 52, paddingHorizontal: spacing.lg },
  submitButtonDisabled: { opacity: 0.65 },
  submitText: { color: '#FFFFFF', ...typography.body, fontWeight: '900' },
});


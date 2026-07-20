import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { offlineService } from '../services/offline';
import { mobileAuth } from '../services/auth';
import type { RootStackParamList } from '../navigation/types';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

interface ReportIssueProps {
  route: { params?: Partial<RootStackParamList['ReportIssue']> };
  navigation: NavProp;
}

export default function ReportIssueScreen({ route, navigation }: ReportIssueProps) {
  const { rideId } = (route.params as { rideId?: string }) || {};
  const [selectedIssue, setSelectedIssue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [description, setDescription] = useState('');

  const issues = [
    'السائق تأخر',
    'تم احتساب أجرة غير صحيحة',
    'تصرف السائق لم يكن مهني',
    'حالة المركبة سيئة',
    'ملاحظة أمان',
    'أخرى',
  ];

  const handleSubmit = async () => {
    if (!selectedIssue) {
      Alert.alert('خطأ', 'اختار نوع المشكلة');
      return;
    }
    setIsSubmitting(true);

    const payload = {
      bookingId: rideId,
      issueType: selectedIssue,
      description: description.trim(),
    };

    try {
      if (!offlineService.isDeviceOnline()) {
        await offlineService.queueOfflineAction({
          type: 'ISSUE_REPORT',
          payload,
        });
      } else {
        const baseUrl = process.env.EXPO_PUBLIC_API_URL;
        if (!baseUrl) throw new Error('API URL not configured');
        const base = baseUrl.replace(/\/$/, '');
        const token = mobileAuth.getAccessToken?.() ?? undefined;
        const response = await fetch(`${base}/reports`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error(`Report failed: ${response.status}`);
      }

      Alert.alert(
        'تم إرسال البلاغ',
        'شكراً لملاحظتك. فريق الدعم رح يراجع البلاغ قريباً.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert(
        'ما قدرنا نرسل البلاغ',
        err instanceof Error ? err.message : 'جرّب مرة ثانية لما يرجع الاتصال.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderIcon = (issue: string) => {
    return selectedIssue === issue ? <Ionicons name="checkmark-circle" size={24} color="#27ae60" /> : <View style={styles.radioCircle} />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>بلّغ عن مشكلة</Text>
        <Text style={styles.subtitle}>ساعدنا نحسّن تجربتك</Text>

        {rideId && (
          <View style={styles.rideInfo}>
            <Text style={styles.rideLabel}>رقم المشوار:</Text>
            <Text style={styles.rideValue}>{rideId}</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>شو اللي صار؟</Text>
        {issues.map((issue) => (
          <TouchableOpacity
            key={issue}
            style={[styles.issueItem, selectedIssue === issue && styles.issueItemSelected]}
            onPress={() => setSelectedIssue(issue)}
          >
            {renderIcon(issue)}
            <Text style={[styles.issueText, selectedIssue === issue && styles.issueTextSelected]}>
              {issue}
            </Text>
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>تفاصيل إضافية</Text>
        <TextInput
          style={styles.textArea}
          placeholder="اكتب تفاصيل المشكلة..."
          multiline
          numberOfLines={6}
          value={description}
          onChangeText={setDescription}
        />

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>إرسال البلاغ</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 24,
  },
  rideInfo: {
    flexDirection: 'row',
    backgroundColor: '#e9ecef',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    alignItems: 'center',
  },
  rideLabel: {
    fontSize: 14,
    color: '#495057',
    marginRight: 8,
  },
  rideValue: {
    fontSize: 14,
    color: '#212529',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#343a40',
    marginTop: 20,
    marginBottom: 16,
  },
  issueItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#dee2e6',
    flexDirection: 'row',
    alignItems: 'center',
  },
  issueItemSelected: {
    borderColor: '#27ae60',
    backgroundColor: '#e6f7f0',
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#adb5bd',
  },
  issueText: {
    fontSize: 16,
    color: '#495057',
    marginLeft: 12,
  },
  issueTextSelected: {
    color: '#27ae60',
    fontWeight: '600',
  },
  textArea: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 140,
    borderWidth: 1,
    borderColor: '#dee2e6',
    color: '#495057',
  },
  submitButton: {
    backgroundColor: '#007bff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

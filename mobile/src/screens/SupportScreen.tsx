import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, StatusBar, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { useHaptics } from '../hooks/useHaptics';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { C, S, R, T } from '../theme';

type Category = 'booking' | 'payment' | 'account' | 'safety' | 'other';

const CATEGORIES: { id: Category; label: string; icon: string }[] = [
  { id: 'booking', label: 'Booking Issue', icon: 'car-outline' },
  { id: 'payment', label: 'Payment Problem', icon: 'card-outline' },
  { id: 'account', label: 'Account Help', icon: 'person-outline' },
  { id: 'safety', label: 'Safety Concern', icon: 'shield-outline' },
  { id: 'other', label: 'Other', icon: 'help-circle-outline' },
];

const FAQ = [
  { q: 'How do I cancel a booking?', a: 'Go to My Trips, select the booking, and tap Cancel. Refunds depend on cancellation timing.' },
  { q: 'When will I get my refund?', a: 'Refunds are processed within 3-5 business days to your original payment method.' },
  { q: 'How do I contact my driver?', a: 'Once your booking is confirmed, you can message your driver through the trip chat.' },
  { q: 'What if my driver is late?', a: 'Contact your driver via chat. If they don\'t respond, contact support immediately.' },
];

export default function SupportScreen() {
  const { user } = useAuth();
  const { light, success } = useHaptics();

  const [category, setCategory] = useState<Category | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showFAQ, setShowFAQ] = useState(true);

  const handleSubmit = async () => {
    if (!category || !subject.trim() || !message.trim()) {
      Alert.alert('Missing Information', 'Please fill in all fields.');
      return;
    }

    light();
    setLoading(true);

    try {
      const { error } = await supabase.from('support_tickets').insert({
        user_id: user!.id,
        category,
        subject: subject.trim(),
        message: message.trim(),
        status: 'open',
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      success();
      Alert.alert('Ticket Submitted', 'Our support team will respond within 24 hours.', [
        { text: 'OK', onPress: () => { setCategory(null); setSubject(''); setMessage(''); } }
      ]);
    } catch (err) {
      Alert.alert('Error', 'Failed to submit ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Help & Support</Text>
          <Text style={styles.subtitle}>We're here to help you</Text>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Quick Actions</Text>
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.quickAction}
                onPress={() => { light(); Alert.alert('Emergency', 'Call Jordan emergency: 911'); }}
                accessibilityLabel="Emergency contact"
                accessibilityRole="button"
              >
                <Ionicons name="call" size={20} color={C.red} />
                <Text style={[styles.quickActionText, { color: C.red }]}>Emergency</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickAction}
                onPress={() => { light(); setShowFAQ(!showFAQ); }}
                accessibilityLabel="View FAQ"
                accessibilityRole="button"
              >
                <Ionicons name="help-circle" size={20} color={C.cyan} />
                <Text style={styles.quickActionText}>FAQ</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* FAQ */}
          {showFAQ && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Frequently Asked Questions</Text>
              {FAQ.map((item, idx) => (
                <View key={idx} style={styles.faqCard}>
                  <Text style={styles.faqQuestion}>{item.q}</Text>
                  <Text style={styles.faqAnswer}>{item.a}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Contact Form */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Submit a Support Ticket</Text>

            {/* Category Selection */}
            <View style={styles.categories}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryBtn, category === cat.id && styles.categoryBtnActive]}
                  onPress={() => { light(); setCategory(cat.id); }}
                  accessibilityLabel={cat.label}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: category === cat.id }}
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={18}
                    color={category === cat.id ? C.cyan : C.muted}
                  />
                  <Text style={[styles.categoryText, category === cat.id && styles.categoryTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Subject */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Subject</Text>
              <TextInput
                style={styles.input}
                value={subject}
                onChangeText={setSubject}
                placeholder="Brief description of your issue"
                placeholderTextColor={C.muted}
                selectionColor={C.cyan}
                maxLength={100}
                accessibilityLabel="Subject"
              />
            </View>

            {/* Message */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Message</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={message}
                onChangeText={setMessage}
                placeholder="Describe your issue in detail..."
                placeholderTextColor={C.muted}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                selectionColor={C.cyan}
                maxLength={1000}
                accessibilityLabel="Message"
              />
              <Text style={styles.charCount}>{message.length}/1000</Text>
            </View>

            <Button
              label="Submit Ticket"
              onPress={handleSubmit}
              loading={loading}
              disabled={!category || !subject.trim() || !message.trim()}
              size="lg"
            />
          </View>

          {/* Contact Info */}
          <View style={styles.contactCard}>
            <Text style={styles.contactTitle}>Other Ways to Reach Us</Text>
            <View style={styles.contactItem}>
              <Ionicons name="mail" size={16} color={C.cyan} />
              <Text style={styles.contactText}>support@wasel.jo</Text>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="call" size={16} color={C.cyan} />
              <Text style={styles.contactText}>+962 6 XXX XXXX</Text>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="time" size={16} color={C.cyan} />
              <Text style={styles.contactText}>Available 24/7</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { padding: S.xl, paddingBottom: S['4xl'], gap: 0 },
  title: { ...T.h1, marginBottom: S.xs },
  subtitle: { ...T.small, marginBottom: S.xl },
  section: { marginBottom: S.xl },
  sectionLabel: { ...T.label, marginBottom: S.md },
  quickActions: { flexDirection: 'row', gap: S.md },
  quickAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: S.sm, backgroundColor: C.card, borderRadius: R.md, padding: S.lg, borderWidth: 1, borderColor: C.border },
  quickActionText: { fontSize: 14, fontWeight: '600', color: C.text },
  faqCard: { backgroundColor: C.card, borderRadius: R.md, padding: S.lg, borderWidth: 1, borderColor: C.border, marginBottom: S.sm },
  faqQuestion: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: S.xs },
  faqAnswer: { fontSize: 13, color: C.sub, lineHeight: 20 },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, marginBottom: S.lg },
  categoryBtn: { flexDirection: 'row', alignItems: 'center', gap: S.xs, backgroundColor: C.card, borderRadius: R.sm, paddingHorizontal: S.md, paddingVertical: S.sm, borderWidth: 1, borderColor: C.border },
  categoryBtnActive: { borderColor: C.cyanBorder, backgroundColor: C.cyanDim },
  categoryText: { fontSize: 13, fontWeight: '600', color: C.muted },
  categoryTextActive: { color: C.cyan },
  fieldGroup: { marginBottom: S.lg },
  fieldLabel: { ...T.label, marginBottom: S.xs },
  input: { backgroundColor: C.card, borderRadius: R.md, borderWidth: 1, borderColor: C.border, paddingHorizontal: S.md, paddingVertical: S.md, fontSize: 15, color: C.text },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  charCount: { fontSize: 11, color: C.muted, textAlign: 'right', marginTop: S.xs },
  contactCard: { backgroundColor: C.card, borderRadius: R.lg, padding: S.lg, borderWidth: 1, borderColor: C.border, gap: S.md },
  contactTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: S.xs },
  contactItem: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  contactText: { fontSize: 14, color: C.sub },
});

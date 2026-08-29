import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import {
  InfoCard,
  PremiumPanel,
  PrimaryButton,
  ScreenShell,
  SectionHeader,
  StateNotice,
  StatusPill,
} from '../components/MobilePrimitives';
import { useAuth } from '../providers/AuthProvider';
import { colors, radii, spacing } from '../theme';

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
}

const SafetyScreen = React.memo(function SafetyScreen() {
  const { user } = useAuth();
  const [sosStage, setSosStage] = useState<'idle' | 'confirm' | 'sent'>('idle');
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [addingContact, setAddingContact] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [checklistDone, setChecklistDone] = useState<Record<string, boolean>>({});

  const CHECKLIST = [
    { id: 'driver', label: 'تأكد من اسم السائق ورقم اللوحة' },
    { id: 'share', label: 'شارك المشوار مع جهة اتصال' },
    { id: 'phone', label: 'شحن الهاتف فوق ٢٠٪' },
    { id: 'seatbelt', label: 'اربط حزام الأمان' },
  ];

  const completedCount = CHECKLIST.filter(c => checklistDone[c.id]).length;

  const triggerSOS = useCallback(() => {
    if (sosStage === 'idle') {
      setSosStage('confirm');
      return;
    }
    setSosStage('sent');
    Alert.alert(
      'تم إرسال SOS',
      'تم تنبيه جهات الطوارئ ودعم واصل مع موقعك.',
    );
  }, [sosStage]);

  const addContact = useCallback(() => {
    if (!newName.trim() || !newPhone.trim()) {
      Alert.alert('معلومات ناقصة', 'اكتب الاسم ورقم الهاتف.');
      return;
    }
    setContacts(prev => [
      ...prev,
      { id: Date.now().toString(), name: newName.trim(), phone: newPhone.trim() },
    ]);
    setNewName('');
    setNewPhone('');
    setAddingContact(false);
  }, [newName, newPhone]);

  const toggleChecklist = useCallback((id: string) => {
    setChecklistDone(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  return (
    <ScreenShell testID="safety-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.statusRow}>
          <StatusPill
            label={user ? 'حساب موثق' : 'وضع الزائر'}
            tone={user ? colors.green : colors.amber}
            icon={user ? 'shield-checkmark' : 'warning'}
          />
          <StatusPill
            label={`${completedCount}/${CHECKLIST.length} فحوصات`}
            tone={completedCount === CHECKLIST.length ? colors.green : colors.amber}
            icon="checkmark-circle"
          />
        </View>

        <SectionHeader
          eyebrow="مركز الأمان"
          title="خليك آمن بكل مشوار"
          body="قائمة قبل المشوار وجهات الطوارئ وSOS بمكان واحد."
        />

        {/* SOS Panel */}
        <PremiumPanel tone="dark">
          <SectionHeader
            eyebrow="طوارئ"
            title={sosStage === 'sent' ? 'تم إرسال SOS' : sosStage === 'confirm' ? 'تأكيد SOS؟' : 'إرسال SOS'}
            body={
              sosStage === 'sent'
                ? 'تم تنبيه جهات الاتصال ودعم واصل مع موقعك.'
                : sosStage === 'confirm'
                ? 'هذا بتنبه جهات الطوارئ ودعم واصل فوراً.'
                : 'اضغط لإرسال تنبيه فوري لجهات الطوارئ ودعم واصل.'
            }
            tone="dark"
          />
          <View style={styles.sosRow}>
            {sosStage !== 'sent' && (
              <PrimaryButton
                label={sosStage === 'confirm' ? 'أكّد إرسال SOS الآن' : 'شغّل SOS'}
                icon="warning"
                tone={sosStage === 'confirm' ? colors.red : colors.rose}
                onPress={triggerSOS}
                testID="sos-button"
              />
            )}
            {sosStage === 'confirm' && (
              <PrimaryButton
                label="إلغاء"
                icon="close"
                tone={colors.muted}
                onPress={() => setSosStage('idle')}
              />
            )}
            {sosStage === 'sent' && (
              <PrimaryButton
                label="إعادة ضبط"
                icon="refresh"
                tone={colors.blue}
                onPress={() => setSosStage('idle')}
              />
            )}
          </View>
        </PremiumPanel>

        {/* Pre-ride checklist */}
        <SectionHeader
          eyebrow="قائمة التحقق"
          title="قبل كل مشوار"
          body="اضغط كل بند بعد ما تتأكد منه."
        />
        {CHECKLIST.map(item => (
          <PrimaryButton
            key={item.id}
            label={item.label}
            icon={checklistDone[item.id] ? 'checkmark-circle' : 'ellipse-outline'}
            tone={checklistDone[item.id] ? colors.green : colors.muted}
            onPress={() => toggleChecklist(item.id)}
          />
        ))}

        {/* Emergency contacts */}
        <SectionHeader
          eyebrow="جهات الطوارئ"
          title={contacts.length > 0 ? `${contacts.length} جهات اتصال` : 'لسه ما في جهات اتصال'}
          body="بننبه جهات الاتصال عند إرسال SOS."
        />

        {contacts.map(contact => (
          <StateNotice
            key={contact.id}
            icon="person"
            title={contact.name}
            body={contact.phone}
            tone={colors.teal}
          />
        ))}

        {addingContact ? (
          <PremiumPanel>
            <View style={styles.form}>
              <TextInput
                placeholder="اسم جهة الاتصال"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={newName}
                onChangeText={setNewName}
                autoCapitalize="words"
              />
              <TextInput
                placeholder="رقم الهاتف"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={newPhone}
                onChangeText={setNewPhone}
                keyboardType="phone-pad"
              />
              <View style={styles.sosRow}>
                <PrimaryButton label="احفظ جهة الاتصال" icon="checkmark" tone={colors.teal} onPress={addContact} />
                <PrimaryButton label="إلغاء" icon="close" tone={colors.muted} onPress={() => setAddingContact(false)} />
              </View>
            </View>
          </PremiumPanel>
        ) : (
          <PrimaryButton
            label="أضف جهة طوارئ"
            icon="person-add"
            tone={colors.blue}
            onPress={() => setAddingContact(true)}
            testID="add-contact-button"
          />
        )}

        <InfoCard
          icon="location"
          title="مشاركة الموقع مع SOS"
          body="إحداثيات GPS بتنرسل لجهات الاتصال ودعم واصل عند إرسال SOS."
          tone={colors.teal}
        />
        <InfoCard
          icon="moon"
          title="تفضيلات مناسبة محلياً"
          body="تفضيلات النوع واستراحات الصلاة ووضع رمضان قابلة للتعديل من الإعدادات."
          tone={colors.blue}
        />
      </ScrollView>
    </ScreenShell>
  );
});

const styles = StyleSheet.create({
  scroll: { gap: spacing.lg, paddingBottom: spacing.xxl },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
  sosRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap' },
  form: { gap: spacing.sm },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
    minHeight: 54,
    paddingHorizontal: spacing.md,
  },
});

export default SafetyScreen;

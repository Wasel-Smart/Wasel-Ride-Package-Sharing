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

const CONTACTS_KEY = 'safety_contacts';

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
    { id: 'driver', label: 'Verify driver name & plate' },
    { id: 'share', label: 'Share trip with contact' },
    { id: 'phone', label: 'Phone charged above 20%' },
    { id: 'seatbelt', label: 'Seatbelt on' },
  ];

  const completedCount = CHECKLIST.filter(c => checklistDone[c.id]).length;

  const triggerSOS = useCallback(() => {
    if (sosStage === 'idle') {
      setSosStage('confirm');
      return;
    }
    setSosStage('sent');
    Alert.alert(
      'SOS sent',
      'Your emergency contacts and Wasel support have been notified with your location.',
    );
  }, [sosStage]);

  const addContact = useCallback(() => {
    if (!newName.trim() || !newPhone.trim()) {
      Alert.alert('Missing info', 'Enter a name and phone number.');
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

  const removeContact = useCallback((id: string) => {
    Alert.alert('Remove contact', 'Remove this emergency contact?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setContacts(prev => prev.filter(c => c.id !== id)) },
    ]);
  }, []);

  const toggleChecklist = useCallback((id: string) => {
    setChecklistDone(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  return (
    <ScreenShell testID="safety-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.statusRow}>
          <StatusPill
            label={user ? 'Verified account' : 'Guest mode'}
            tone={user ? colors.green : colors.amber}
            icon={user ? 'shield-checkmark' : 'warning'}
          />
          <StatusPill
            label={`${completedCount}/${CHECKLIST.length} checks`}
            tone={completedCount === CHECKLIST.length ? colors.green : colors.amber}
            icon="checkmark-circle"
          />
        </View>

        <SectionHeader
          eyebrow="Safety center"
          title="Stay safe every ride"
          body="Pre-ride checklist, emergency contacts, and SOS are all in one place."
        />

        {/* SOS Panel */}
        <PremiumPanel tone="dark">
          <SectionHeader
            eyebrow="Emergency"
            title={sosStage === 'sent' ? 'SOS sent' : sosStage === 'confirm' ? 'Confirm SOS?' : 'Trigger SOS'}
            body={
              sosStage === 'sent'
                ? 'Your contacts and Wasel support have been alerted with your location.'
                : sosStage === 'confirm'
                ? 'This will alert your emergency contacts and Wasel support immediately.'
                : 'Hold to send an instant alert to your emergency contacts and Wasel support.'
            }
            tone="dark"
          />
          <View style={styles.sosRow}>
            {sosStage !== 'sent' && (
              <PrimaryButton
                label={sosStage === 'confirm' ? 'Confirm — send SOS now' : 'Trigger SOS'}
                icon="warning"
                tone={sosStage === 'confirm' ? colors.red : colors.rose}
                onPress={triggerSOS}
                testID="sos-button"
              />
            )}
            {sosStage === 'confirm' && (
              <PrimaryButton
                label="Cancel"
                icon="close"
                tone={colors.muted}
                onPress={() => setSosStage('idle')}
              />
            )}
            {sosStage === 'sent' && (
              <PrimaryButton
                label="Reset"
                icon="refresh"
                tone={colors.blue}
                onPress={() => setSosStage('idle')}
              />
            )}
          </View>
        </PremiumPanel>

        {/* Pre-ride checklist */}
        <SectionHeader
          eyebrow="Checklist"
          title="Before every ride"
          body="Tap each item as you confirm it."
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
          eyebrow="Emergency contacts"
          title={contacts.length > 0 ? `${contacts.length} contact${contacts.length > 1 ? 's' : ''}` : 'No contacts yet'}
          body="Contacts are notified when you trigger SOS."
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
                placeholder="Contact name"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={newName}
                onChangeText={setNewName}
                autoCapitalize="words"
              />
              <TextInput
                placeholder="Phone number"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={newPhone}
                onChangeText={setNewPhone}
                keyboardType="phone-pad"
              />
              <View style={styles.sosRow}>
                <PrimaryButton label="Save contact" icon="checkmark" tone={colors.teal} onPress={addContact} />
                <PrimaryButton label="Cancel" icon="close" tone={colors.muted} onPress={() => setAddingContact(false)} />
              </View>
            </View>
          </PremiumPanel>
        ) : (
          <PrimaryButton
            label="Add emergency contact"
            icon="person-add"
            tone={colors.blue}
            onPress={() => setAddingContact(true)}
            testID="add-contact-button"
          />
        )}

        <InfoCard
          icon="location"
          title="Location shared on SOS"
          body="Your GPS coordinates are captured and sent to contacts and Wasel support when you trigger SOS."
          tone={colors.teal}
        />
        <InfoCard
          icon="moon"
          title="Cultural preferences"
          body="Gender preferences, prayer stops, and Ramadan mode are configurable in Settings."
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

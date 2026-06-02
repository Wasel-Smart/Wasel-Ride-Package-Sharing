import { Link } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const checkpoints = [
  ['Live rides', 'Driver and rider status cards with route context.'],
  ['Packages', 'Pickup, custody transfer, and delivery confirmation.'],
  ['Trust', 'Identity, safety, support, and incident escalation.'],
  ['Notifications', 'SMS, push, and in-app delivery status surfaces.'],
];

export default function OperationsPreview() {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Link href="/" style={styles.backLink}>
          Back
        </Link>

        <Text style={styles.title}>Operations preview</Text>
        <Text style={styles.copy}>
          This native foundation is ready for screen-by-screen implementation
          against the existing Supabase and Edge Function contracts.
        </Text>

        <View style={styles.list}>
          {checkpoints.map(([title, body]) => (
            <View key={title} style={styles.card}>
              <Text style={styles.cardTitle}>{title}</Text>
              <Text style={styles.cardCopy}>{body}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  backLink: {
    color: '#67E8F9',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 24,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
  },
  copy: {
    color: '#CBD5E1',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
  },
  list: {
    gap: 16,
    marginTop: 24,
  },
  card: {
    backgroundColor: '#111827',
    borderColor: '#334155',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  cardCopy: {
    color: '#CBD5E1',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 8,
  },
});

import { Link } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MetricCard } from '../src/components/MetricCard';
import { waselMobileConfig } from '../src/lib/config';

const flows = [
  'Find nearby rides',
  'Offer a ride',
  'Track package delivery',
  'Wallet and Wasel Plus',
];

export default function MobileHome() {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Wasel Mobile</Text>
          <Text style={styles.title}>Ride and package operations in your pocket.</Text>
          <Text style={styles.copy}>
            Native shell for riders, drivers, package handoffs, wallet visibility,
            and live trip status across iOS and Android.
          </Text>
        </View>

        <View style={styles.metrics}>
          <MetricCard label="Backend" value={waselMobileConfig.hasSupabase ? 'Connected' : 'Needs env'} />
          <MetricCard label="Payments" value={waselMobileConfig.hasStripe ? 'Ready' : 'Needs key'} />
          <MetricCard label="Maps" value={waselMobileConfig.hasMaps ? 'Ready' : 'Needs key'} />
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Core mobile flows</Text>
          <View style={styles.flowList}>
            {flows.map(flow => (
              <Text key={flow} style={styles.flowText}>
                {`- ${flow}`}
              </Text>
            ))}
          </View>
        </View>

        <Link href="/operations" style={styles.primaryAction}>
          Open operations preview
        </Link>
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
  hero: {
    marginBottom: 32,
  },
  eyebrow: {
    color: '#67E8F9',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
    marginTop: 12,
  },
  copy: {
    color: '#CBD5E1',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 16,
  },
  metrics: {
    gap: 12,
    marginBottom: 24,
  },
  panel: {
    backgroundColor: '#111827',
    borderColor: '#334155',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  panelTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  flowList: {
    gap: 10,
    marginTop: 16,
  },
  flowText: {
    color: '#CBD5E1',
    fontSize: 16,
  },
  primaryAction: {
    backgroundColor: '#22D3EE',
    borderRadius: 12,
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 24,
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingVertical: 16,
    textAlign: 'center',
  },
});

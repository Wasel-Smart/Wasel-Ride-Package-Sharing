import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

const C = {
  bg: '#0A1628', card: '#0E1D35', card2: '#112240',
  cyan: '#00C8E8', green: '#00C875', gold: '#F0A830',
  red: '#EF4444',
  border: 'rgba(255,255,255,0.08)', text: '#EFF6FF', muted: '#5A7A9A', sub: '#8AA4C0',
} as const;

interface WalletBalance {
  balance_jod: number;
  credits: number;
  loyalty_tier: string;
}

interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount_jod: number;
  description: string;
  created_at: string;
}

export default function WalletScreen() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'balance' | 'history'>('balance');

  useEffect(() => {
    if (!user?.id) return;
    void loadWallet();
  }, [user?.id]);

  const loadWallet = async () => {
    setLoading(true);
    try {
      const { data: walletData } = await supabase
        .from('wallets')
        .select('balance_jod, credits, loyalty_tier')
        .eq('user_id', user!.id)
        .single();

      if (walletData) setWallet(walletData as WalletBalance);

      const { data: txData } = await supabase
        .from('wallet_transactions')
        .select('id, type, amount_jod, description, created_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (txData) setTransactions(txData as Transaction[]);
    } catch {
      // Wallet not yet created for user — show default state
    } finally {
      setLoading(false);
    }
  };

  const balanceJod = wallet?.balance_jod ?? 0;
  const credits = wallet?.credits ?? 0;
  const tier = wallet?.loyalty_tier ?? 'starter';

  const tierColor = tier === 'infrastructure' ? C.gold
    : tier === 'network' ? C.cyan
    : tier === 'dense' ? C.green
    : C.muted;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={styles.header}>
        <Text style={styles.title}>Wallet</Text>
        <Text style={styles.sub}>Your Wasel balance & credits</Text>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={C.cyan} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Balance card */}
          <View style={styles.balanceCard}>
            <View style={styles.balanceRow}>
              <View>
                <Text style={styles.balanceLabel}>Available balance</Text>
                <Text style={styles.balanceValue}>{balanceJod.toFixed(2)}</Text>
                <Text style={styles.balanceCurrency}>JOD</Text>
              </View>
              <View style={styles.tierBadge}>
                <Ionicons name="ribbon" size={16} color={tierColor} />
                <Text style={[styles.tierText, { color: tierColor }]}>
                  {tier.charAt(0).toUpperCase() + tier.slice(1)}
                </Text>
              </View>
            </View>

            <View style={styles.creditRow}>
              <Ionicons name="star" size={14} color={C.gold} />
              <Text style={styles.creditText}>{credits} movement credits</Text>
            </View>

            <View style={styles.walletActions}>
              <TouchableOpacity
                style={[styles.walletBtn, { backgroundColor: C.cyan }]}
                onPress={() => Alert.alert('Top Up', 'Payment integration coming soon.')}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.walletBtnText}>Top Up</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.walletBtn, { backgroundColor: C.card2, borderWidth: 1, borderColor: C.border }]}
                onPress={() => Alert.alert('Withdraw', 'Withdrawal via Jordan bank transfer — coming soon.')}
              >
                <Ionicons name="arrow-down" size={18} color={C.text} />
                <Text style={[styles.walletBtnText, { color: C.text }]}>Withdraw</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            {[
              { label: 'Credits', value: `${credits}`, icon: 'star', color: C.gold },
              { label: 'Tier', value: tier, icon: 'ribbon', color: tierColor },
              { label: 'JOD', value: balanceJod.toFixed(1), icon: 'card', color: C.green },
            ].map(stat => (
              <View key={stat.label} style={styles.statCard}>
                <Ionicons name={stat.icon as any} size={20} color={stat.color} />
                <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            {(['balance', 'history'] as const).map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
                onPress={() => setTab(t)}
              >
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                  {t === 'balance' ? 'Overview' : 'History'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {tab === 'history' && (
            <>
              {transactions.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="receipt-outline" size={40} color={C.muted} />
                  <Text style={styles.emptyTitle}>No transactions yet</Text>
                  <Text style={styles.emptySub}>Book your first ride to see activity here.</Text>
                </View>
              ) : (
                transactions.map(tx => (
                  <View key={tx.id} style={styles.txCard}>
                    <View style={[styles.txIcon, { backgroundColor: tx.type === 'credit' ? C.green + '22' : C.red + '22' }]}>
                      <Ionicons
                        name={tx.type === 'credit' ? 'arrow-up' : 'arrow-down'}
                        size={18}
                        color={tx.type === 'credit' ? C.green : C.red}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txDescription}>{tx.description}</Text>
                      <Text style={styles.txDate}>{new Date(tx.created_at).toLocaleDateString()}</Text>
                    </View>
                    <Text style={[styles.txAmount, { color: tx.type === 'credit' ? C.green : C.red }]}>
                      {tx.type === 'credit' ? '+' : '-'}{tx.amount_jod.toFixed(2)} JOD
                    </Text>
                  </View>
                ))
              )}
            </>
          )}

          {tab === 'balance' && (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Movement Credits</Text>
              <Text style={styles.infoBody}>
                Earn credits by booking rides, sharing routes, and referring friends. Credits unlock
                discounts and priority matching on high-demand corridors.
              </Text>
              <View style={styles.tierLadder}>
                {[
                  { tier: 'Starter', credits: '0–299', color: C.muted },
                  { tier: 'Dense', credits: '300–599', color: C.green },
                  { tier: 'Network', credits: '600–899', color: C.cyan },
                  { tier: 'Infrastructure', credits: '900+', color: C.gold },
                ].map(item => (
                  <View key={item.tier} style={styles.tierRow}>
                    <View style={[styles.tierDot, { backgroundColor: item.color }]} />
                    <Text style={[styles.tierName, { color: item.color }]}>{item.tier}</Text>
                    <Text style={styles.tierRange}>{item.credits} credits</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: C.text },
  sub: { fontSize: 13, color: C.muted, marginTop: 2 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },
  balanceCard: { backgroundColor: C.card, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: C.border },
  balanceRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  balanceLabel: { fontSize: 13, color: C.muted, fontWeight: '600', marginBottom: 4 },
  balanceValue: { fontSize: 44, fontWeight: '800', color: C.text, lineHeight: 48 },
  balanceCurrency: { fontSize: 14, color: C.muted, fontWeight: '600' },
  tierBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.card2, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: C.border },
  tierText: { fontSize: 13, fontWeight: '700' },
  creditRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  creditText: { fontSize: 13, color: C.gold, fontWeight: '600' },
  walletActions: { flexDirection: 'row', gap: 12 },
  walletBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: 14 },
  walletBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: C.card, borderRadius: 16, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: C.border },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 11, color: C.muted, fontWeight: '600' },
  tabs: { flexDirection: 'row', gap: 8 },
  tabBtn: { flex: 1, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card2, borderWidth: 1, borderColor: C.border },
  tabBtnActive: { borderColor: C.cyan, backgroundColor: C.cyan + '15' },
  tabText: { fontSize: 14, fontWeight: '600', color: C.muted },
  tabTextActive: { color: C.cyan },
  emptyCard: { backgroundColor: C.card, borderRadius: 16, padding: 32, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: C.border },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  emptySub: { fontSize: 13, color: C.muted, textAlign: 'center' },
  txCard: { backgroundColor: C.card, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: C.border },
  txIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txDescription: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 3 },
  txDate: { fontSize: 12, color: C.muted },
  txAmount: { fontSize: 15, fontWeight: '800' },
  infoCard: { backgroundColor: C.card, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: C.border, gap: 14 },
  infoTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  infoBody: { fontSize: 13, color: C.sub, lineHeight: 20 },
  tierLadder: { gap: 10 },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tierDot: { width: 8, height: 8, borderRadius: 4 },
  tierName: { fontSize: 13, fontWeight: '700', flex: 1 },
  tierRange: { fontSize: 12, color: C.muted },
});

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

const C = {
  bg: '#0A1628', card: '#0E1D35', card2: '#112240',
  cyan: '#00C8E8', green: '#00C875', gold: '#F0A830',
  border: 'rgba(255,255,255,0.08)', text: '#EFF6FF', muted: '#5A7A9A', sub: '#8AA4C0',
} as const;

interface ProfileData {
  full_name: string;
  phone: string;
  bio: string;
  rides_completed: number;
  packages_sent: number;
  member_since: string;
  rating: number;
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBio, setEditBio] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    void loadProfile();
  }, [user?.id]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, phone, bio, rides_completed, packages_sent, member_since, rating')
        .eq('id', user!.id)
        .single();

      if (data) {
        setProfile(data as ProfileData);
        setEditName(data.full_name ?? '');
        setEditPhone(data.phone ?? '');
        setEditBio(data.bio ?? '');
      } else {
        // Bootstrap from auth metadata
        const meta = user?.user_metadata ?? {};
        const bootstrapped: ProfileData = {
          full_name: String(meta.full_name ?? meta.name ?? ''),
          phone: String(meta.phone ?? ''),
          bio: '',
          rides_completed: 0,
          packages_sent: 0,
          member_since: new Date().toISOString(),
          rating: 5.0,
        };
        setProfile(bootstrapped);
        setEditName(bootstrapped.full_name);
        setEditPhone(bootstrapped.phone);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: user!.id,
        full_name: editName.trim(),
        phone: editPhone.trim(),
        bio: editBio.trim(),
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      setProfile(prev => prev ? { ...prev, full_name: editName, phone: editPhone, bio: editBio } : null);
      setEditing(false);
    } catch {
      Alert.alert('Error', 'Could not save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  const firstName = profile?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'You';
  const initials = profile?.full_name
    ? profile.full_name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('')
    : 'W';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity onPress={() => setEditing(!editing)} style={styles.editBtn}>
          <Ionicons name={editing ? 'close' : 'create-outline'} size={20} color={C.cyan} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loader}><ActivityIndicator size="large" color={C.cyan} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            {!editing && (
              <>
                <Text style={styles.displayName}>{profile?.full_name || firstName}</Text>
                <Text style={styles.email}>{user?.email}</Text>
                {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
              </>
            )}
          </View>

          {/* Edit form */}
          {editing && (
            <View style={styles.editCard}>
              <Text style={styles.sectionTitle}>Edit profile</Text>
              {[
                { label: 'Full name', value: editName, setter: setEditName, placeholder: 'Your full name', icon: 'person-outline' },
                { label: 'Phone', value: editPhone, setter: setEditPhone, placeholder: '+962 7X XXX XXXX', icon: 'call-outline' },
              ].map(field => (
                <View key={field.label} style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  <View style={styles.fieldRow}>
                    <Ionicons name={field.icon as any} size={16} color={C.muted} />
                    <TextInput
                      style={styles.fieldInput}
                      value={field.value}
                      onChangeText={field.setter}
                      placeholder={field.placeholder}
                      placeholderTextColor={C.muted}
                      selectionColor={C.cyan}
                    />
                  </View>
                </View>
              ))}
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Bio</Text>
                <TextInput
                  style={[styles.fieldInput, styles.bioInput]}
                  value={editBio}
                  onChangeText={setEditBio}
                  placeholder="A few words about yourself…"
                  placeholderTextColor={C.muted}
                  multiline
                  selectionColor={C.cyan}
                />
              </View>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save changes</Text>}
              </TouchableOpacity>
            </View>
          )}

          {/* Stats */}
          <View style={styles.statsRow}>
            {[
              { label: 'Rides', value: profile?.rides_completed ?? 0, icon: 'car', color: C.cyan },
              { label: 'Packages', value: profile?.packages_sent ?? 0, icon: 'cube', color: C.gold },
              { label: 'Rating', value: profile?.rating?.toFixed(1) ?? '5.0', icon: 'star', color: C.green },
            ].map(stat => (
              <View key={stat.label} style={styles.statCard}>
                <Ionicons name={stat.icon as any} size={22} color={stat.color} />
                <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Account info */}
          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Account</Text>
            {[
              { label: 'Email', value: user?.email ?? '—', icon: 'mail-outline' },
              { label: 'Phone', value: profile?.phone || 'Not set', icon: 'call-outline' },
              {
                label: 'Member since',
                value: profile?.member_since
                  ? new Date(profile.member_since).toLocaleDateString()
                  : '—',
                icon: 'calendar-outline',
              },
            ].map(item => (
              <View key={item.label} style={styles.infoRow}>
                <Ionicons name={item.icon as any} size={16} color={C.muted} />
                <View>
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  <Text style={styles.infoValue}>{item.value}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Sign out */}
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={18} color="#EF4444" />
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>

          <Text style={styles.version}>Wasel v1.0 · Built for Jordan</Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: C.text },
  editBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },
  avatarSection: { alignItems: 'center', gap: 8, paddingVertical: 20 },
  avatar: { width: 80, height: 80, borderRadius: 20, backgroundColor: C.cyan + '22', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.cyan + '44' },
  avatarText: { fontSize: 32, fontWeight: '800', color: C.cyan },
  displayName: { fontSize: 22, fontWeight: '800', color: C.text },
  email: { fontSize: 14, color: C.muted },
  bio: { fontSize: 13, color: C.sub, textAlign: 'center', lineHeight: 20 },
  editCard: { backgroundColor: C.card, borderRadius: 18, padding: 18, gap: 14, borderWidth: 1, borderColor: C.border },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  fieldBlock: { gap: 6 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card2, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.border },
  fieldInput: { flex: 1, fontSize: 15, color: C.text, fontWeight: '600' },
  bioInput: { minHeight: 80, textAlignVertical: 'top', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.card2 },
  saveBtn: { backgroundColor: C.cyan, borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: C.card, borderRadius: 16, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: C.border },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11, color: C.muted, fontWeight: '600' },
  infoCard: { backgroundColor: C.card, borderRadius: 16, padding: 18, gap: 14, borderWidth: 1, borderColor: C.border },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  infoLabel: { fontSize: 11, color: C.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  infoValue: { fontSize: 14, color: C.text, fontWeight: '600' },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#EF444422', borderRadius: 14, height: 50, borderWidth: 1, borderColor: '#EF444430' },
  signOutText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
  version: { textAlign: 'center', fontSize: 12, color: C.muted },
});

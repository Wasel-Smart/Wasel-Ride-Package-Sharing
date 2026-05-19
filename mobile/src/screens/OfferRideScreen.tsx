import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, Switch, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { C, S, R, T } from '../theme';

const CITIES = ['Amman', 'Aqaba', 'Irbid', 'Zarqa', 'Salt', 'Karak', 'Jerash', 'Madaba', 'Mafraq', 'Ajloun'];

interface Prefs {
  genderPref: 'any' | 'male' | 'female';
  prayerStops: boolean;
  acceptsPackages: boolean;
  smoking: boolean;
  pets: boolean;
  music: boolean;
}

export default function OfferRideScreen() {
  const { user } = useAuth();

  const [from,     setFrom]     = useState('Amman');
  const [to,       setTo]       = useState('');
  const [date,     setDate]     = useState('');
  const [time,     setTime]     = useState('');
  const [seats,    setSeats]    = useState(3);
  const [price,    setPrice]    = useState('');
  const [carModel, setCarModel] = useState('');
  const [notes,    setNotes]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [picker,   setPicker]   = useState<'from' | 'to' | null>(null);

  const [prefs, setPrefs] = useState<Prefs>({
    genderPref: 'any', prayerStops: false, acceptsPackages: false,
    smoking: false, pets: false, music: true,
  });

  const togglePref = <K extends keyof Prefs>(key: K, val: Prefs[K]) =>
    setPrefs(p => ({ ...p, [key]: val }));

  const validate = () => {
    if (!from || !to)    return 'Select departure and destination.';
    if (from === to)     return 'Origin and destination must be different.';
    if (!date)           return 'Select a departure date (YYYY-MM-DD).';
    if (!time)           return 'Select a departure time (HH:MM).';
    if (!price || isNaN(Number(price)) || Number(price) <= 0)
                         return 'Enter a valid price per seat.';
    return null;
  };

  const handlePost = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    if (!user) { setError('You must be signed in.'); return; }
    setError(null);
    setLoading(true);
    try {
      const { error: supaErr } = await supabase.from('trips').insert({
        driver_id:        user.id,
        from_city:        from,
        to_city:          to,
        departure_date:   date,
        departure_time:   time,
        total_seats:      seats,
        available_seats:  seats,
        price_per_seat:   Number(price),
        car_model:        carModel.trim() || null,
        notes:            notes.trim() || null,
        gender_pref:      prefs.genderPref,
        prayer_stops:     prefs.prayerStops,
        accepts_packages: prefs.acceptsPackages,
        smoking_allowed:  prefs.smoking,
        pets_allowed:     prefs.pets,
        music_allowed:    prefs.music,
        status:           'published',
      });
      if (supaErr) throw supaErr;
      Alert.alert('Ride posted!', 'Your ride is now visible to passengers.', [{ text: 'Great!' }]);
      // Reset
      setTo(''); setDate(''); setTime(''); setPrice(''); setCarModel(''); setNotes('');
      setSeats(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to post ride');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Offer a Ride</Text>
          <Text style={styles.subtitle}>Fill in your route details and post it for passengers.</Text>

          {/* Route section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Route</Text>
            <View style={styles.card}>
              {/* From */}
              <TouchableOpacity style={styles.cityRow} onPress={() => setPicker('from')} activeOpacity={0.75}>
                <View style={[styles.cityDot, { backgroundColor: C.green }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cityFieldLabel}>From</Text>
                  <Text style={[styles.cityValue, !from && styles.placeholder]}>{from || 'Select city'}</Text>
                </View>
                <Ionicons name="chevron-down" size={16} color={C.muted} />
              </TouchableOpacity>
              <View style={styles.cityDivider} />
              {/* To */}
              <TouchableOpacity style={styles.cityRow} onPress={() => setPicker('to')} activeOpacity={0.75}>
                <View style={[styles.cityDot, { backgroundColor: C.cyan }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cityFieldLabel}>To</Text>
                  <Text style={[styles.cityValue, !to && styles.placeholder]}>{to || 'Select city'}</Text>
                </View>
                <Ionicons name="chevron-down" size={16} color={C.muted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* City picker modal-inline */}
          {picker && (
            <View style={styles.pickerPanel}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Select {picker === 'from' ? 'departure' : 'destination'}</Text>
                <TouchableOpacity onPress={() => setPicker(null)}><Ionicons name="close" size={20} color={C.sub} /></TouchableOpacity>
              </View>
              {CITIES.filter(c => (picker === 'from' ? c !== to : c !== from)).map(city => (
                <TouchableOpacity
                  key={city}
                  style={styles.pickerItem}
                  onPress={() => { picker === 'from' ? setFrom(city) : setTo(city); setPicker(null); }}
                  activeOpacity={0.75}
                >
                  <Ionicons name="location-outline" size={16} color={C.muted} />
                  <Text style={styles.pickerItemText}>{city}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Date & Time */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Date &amp; Time</Text>
            <View style={styles.row2}>
              <View style={[styles.card, { flex: 1 }]}>
                <Text style={styles.cityFieldLabel}>Date</Text>
                <TextInput
                  style={styles.inlineInput}
                  value={date}
                  onChangeText={setDate}
                  placeholder="2025-08-15"
                  placeholderTextColor={C.muted}
                  selectionColor={C.cyan}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              <View style={[styles.card, { flex: 1 }]}>
                <Text style={styles.cityFieldLabel}>Time</Text>
                <TextInput
                  style={styles.inlineInput}
                  value={time}
                  onChangeText={setTime}
                  placeholder="08:30"
                  placeholderTextColor={C.muted}
                  selectionColor={C.cyan}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>
          </View>

          {/* Seats & Price */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Seats &amp; Price</Text>
            <View style={styles.row2}>
              {/* Seats */}
              <View style={[styles.card, { flex: 1, gap: S.sm }]}>
                <Text style={styles.cityFieldLabel}>Available seats</Text>
                <View style={styles.stepper}>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => setSeats(s => Math.max(1, s - 1))} disabled={seats <= 1}>
                    <Ionicons name="remove" size={18} color={seats <= 1 ? C.dim : C.text} />
                  </TouchableOpacity>
                  <Text style={styles.stepValue}>{seats}</Text>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => setSeats(s => Math.min(7, s + 1))} disabled={seats >= 7}>
                    <Ionicons name="add" size={18} color={seats >= 7 ? C.dim : C.text} />
                  </TouchableOpacity>
                </View>
              </View>
              {/* Price */}
              <View style={[styles.card, { flex: 1 }]}>
                <Text style={styles.cityFieldLabel}>Price per seat</Text>
                <View style={styles.priceRow}>
                  <TextInput
                    style={[styles.inlineInput, { flex: 1 }]}
                    value={price}
                    onChangeText={setPrice}
                    placeholder="5.00"
                    placeholderTextColor={C.muted}
                    keyboardType="decimal-pad"
                    selectionColor={C.cyan}
                  />
                  <Text style={styles.currency}>JOD</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Car model */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Vehicle (optional)</Text>
            <View style={styles.card}>
              <TextInput
                style={styles.inlineInput}
                value={carModel}
                onChangeText={setCarModel}
                placeholder="e.g. Toyota Camry 2022"
                placeholderTextColor={C.muted}
                selectionColor={C.cyan}
              />
            </View>
          </View>

          {/* Preferences */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Preferences</Text>
            <View style={styles.card}>
              {/* Gender pref */}
              <View style={styles.prefRow}>
                <View style={styles.prefLeft}>
                  <Ionicons name="people-outline" size={18} color={C.sub} />
                  <Text style={styles.prefLabel}>Passengers</Text>
                </View>
                <View style={styles.genderPicker}>
                  {(['any', 'male', 'female'] as const).map(g => (
                    <TouchableOpacity
                      key={g}
                      style={[styles.genderBtn, prefs.genderPref === g && styles.genderBtnActive]}
                      onPress={() => togglePref('genderPref', g)}
                    >
                      <Text style={[styles.genderText, prefs.genderPref === g && styles.genderTextActive]}>
                        {g.charAt(0).toUpperCase() + g.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.prefDivider} />

              {([
                { key: 'prayerStops',     icon: 'time-outline',       label: 'Prayer stops' },
                { key: 'acceptsPackages', icon: 'cube-outline',        label: 'Accept packages' },
                { key: 'music',           icon: 'musical-notes-outline',label: 'Music allowed' },
                { key: 'smoking',         icon: 'flame-outline',       label: 'Smoking allowed' },
                { key: 'pets',            icon: 'paw-outline',         label: 'Pets allowed' },
              ] as { key: keyof Prefs; icon: string; label: string }[]).map((item, idx, arr) => (
                <View key={item.key}>
                  <View style={styles.prefRow}>
                    <View style={styles.prefLeft}>
                      <Ionicons name={item.icon as any} size={18} color={C.sub} />
                      <Text style={styles.prefLabel}>{item.label}</Text>
                    </View>
                    <Switch
                      value={prefs[item.key] as boolean}
                      onValueChange={v => togglePref(item.key, v as any)}
                      trackColor={{ false: C.card2, true: C.cyanDim }}
                      thumbColor={prefs[item.key] ? C.cyan : C.muted}
                      ios_backgroundColor={C.card2}
                    />
                  </View>
                  {idx < arr.length - 1 && <View style={styles.prefDivider} />}
                </View>
              ))}
            </View>
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Notes for passengers (optional)</Text>
            <View style={styles.card}>
              <TextInput
                style={[styles.inlineInput, { minHeight: 70, textAlignVertical: 'top' }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Any important information for passengers…"
                placeholderTextColor={C.muted}
                multiline
                selectionColor={C.cyan}
              />
            </View>
          </View>

          {/* Error */}
          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={C.red} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Post button */}
          <Button
            label="Post Ride"
            onPress={handlePost}
            loading={loading}
            size="lg"
            style={{ marginTop: S.sm }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: C.bg },
  content:  { padding: S.xl, paddingBottom: S['4xl'], gap: 0 },
  title:    { ...T.h1, marginBottom: S.xs },
  subtitle: { ...T.small, marginBottom: S.xl },

  section:      { marginBottom: S.lg },
  sectionLabel: { ...T.label, marginBottom: S.sm },
  card: {
    backgroundColor: C.card, borderRadius: R.lg,
    borderWidth: 1, borderColor: C.border, padding: S.lg,
  },
  row2: { flexDirection: 'row', gap: S.sm },

  cityRow:        { flexDirection: 'row', alignItems: 'center', gap: S.md },
  cityDot:        { width: 10, height: 10, borderRadius: 5 },
  cityFieldLabel: { ...T.label, marginBottom: 2 },
  cityValue:      { fontSize: 15, fontWeight: '600', color: C.text },
  placeholder:    { color: C.muted },
  cityDivider:    { height: 1, backgroundColor: C.border, marginVertical: S.sm, marginLeft: S.xxl },

  inlineInput: { fontSize: 15, color: C.text, paddingTop: 4 },
  priceRow:    { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  currency:    { fontSize: 13, fontWeight: '700', color: C.muted },

  stepper:   { flexDirection: 'row', alignItems: 'center', gap: S.md },
  stepBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: C.card2, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepValue: { fontSize: 20, fontWeight: '800', color: C.text, minWidth: 28, textAlign: 'center' },

  pickerPanel: {
    backgroundColor: C.card, borderRadius: R.lg,
    borderWidth: 1, borderColor: C.border,
    marginBottom: S.lg, overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: S.lg, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  pickerTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', gap: S.sm,
    paddingHorizontal: S.lg, paddingVertical: 13,
    borderBottomWidth: 0.5, borderBottomColor: C.border,
  },
  pickerItemText: { fontSize: 15, color: C.text },

  prefRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: S.xs },
  prefLeft:     { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  prefLabel:    { fontSize: 14, color: C.text },
  prefDivider:  { height: 0.5, backgroundColor: C.border, marginVertical: S.xs },

  genderPicker: { flexDirection: 'row', gap: 6 },
  genderBtn: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1, borderColor: C.border,
  },
  genderBtnActive:   { borderColor: C.cyanBorder, backgroundColor: C.cyanDim },
  genderText:        { fontSize: 12, color: C.muted, fontWeight: '600' },
  genderTextActive:  { color: C.cyan },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: S.sm,
    backgroundColor: C.redDim, borderRadius: R.sm,
    padding: S.md, marginBottom: S.md,
    borderWidth: 1, borderColor: 'rgba(255,77,106,0.30)',
  },
  errorText: { flex: 1, fontSize: 13, color: C.red },
});

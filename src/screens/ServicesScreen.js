import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, SafeAreaView, StatusBar,
} from 'react-native';
import ResponsiveScreen from '../components/ResponsiveScreen';
import { Colors, Shadows } from '../theme/colors';

const services = [
  { icon: '🃏', name: 'Tarot Reading', desc: 'Get insights about your future with tarot cards.' },
  { icon: '🌟', name: 'Astrology Consultation', desc: 'Know about your stars and planetary positions.' },
  { icon: '✋', name: 'Palm Reading', desc: 'Discover your life path through palm analysis.' },
  { icon: '🏡', name: 'Vastu Consultation', desc: 'Bring positivity and harmony to your space.' },
  { icon: '🔢', name: 'Numerology', desc: 'Find your lucky numbers and hidden energies.' },
  { icon: '✨', name: 'Aura Reading', desc: 'Know about your aura and energy field.' },
];

export default function ServicesScreen({ navigation }) {
  return (
    <ResponsiveScreen backgroundColor={Colors.bg}>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
        <View style={styles.topBar}>
          <View style={styles.logoRow}>
            <Text style={styles.logoEmoji}>🪷</Text>
            <Text style={styles.logoText}>Evdivine</Text>
          </View>
        </View>
        <Text style={styles.pageTitle}>Services</Text>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {services.map((s, i) => (
          <TouchableOpacity
            key={i}
            style={styles.card}
            onPress={() => navigation.navigate('Booking')}
            activeOpacity={0.8}
          >
            <View style={styles.iconBox}>
              <Text style={styles.iconText}>{s.icon}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{s.name}</Text>
              <Text style={styles.desc}>{s.desc}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          ))}
          <View style={{ height: 16 }} />
        </ScrollView>
      </SafeAreaView>
    </ResponsiveScreen>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  logoEmoji: { fontSize: 16 },
  logoText: {
    fontFamily: 'serif',
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    paddingHorizontal: 22,
    paddingBottom: 12,
    paddingTop: 4,
    backgroundColor: Colors.surface,
  },
  list: { padding: 22, gap: 12 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 14,
    ...Shadows.card,
  },
  iconBox: {
    width: 58, height: 58,
    borderRadius: 10,
    backgroundColor: Colors.gradientSoftStart,
    alignItems: 'center', justifyContent: 'center',
  },
  iconText: { fontSize: 28 },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 3 },
  desc: { fontSize: 12, color: Colors.textMuted, lineHeight: 18 },
  chevron: { fontSize: 22, color: Colors.textMuted },
});

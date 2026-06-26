import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import LinearGradient from '../components/LinearGradient';
import ResponsiveScreen from '../components/ResponsiveScreen';
import { Colors, Shadows } from '../theme/colors';
import GradientButton from '../components/GradientButton';

const specialties = [
  { icon: '🃏', label: 'Tarot Reading' },
  { icon: '♈', label: 'Astrology' },
  { icon: '✋', label: 'Palm Reading' },
  { icon: '🏠', label: 'Vastu' },
  { icon: '🔢', label: 'Numerology' },
  { icon: '✨', label: 'Aura Reading' },
];

export default function HomeScreen({ navigation }) {
  return (
    <ResponsiveScreen backgroundColor={Colors.bg}>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

        {/* Top Bar */}
        <View style={styles.topBar}>
          <Text style={styles.menuIcon}>☰</Text>
          <View style={styles.logoRow}>
            <Text style={styles.logoEmoji}>🪷</Text>
            <Text style={styles.logoText}>Evdivine</Text>
          </View>
          <View style={styles.notifBtn}>
            <Text style={styles.notifIcon}>🔔</Text>
            <View style={styles.notifDot} />
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <LinearGradient
          colors={[Colors.gradientSoftStart, Colors.gradientSoftEnd]}
          style={styles.hero}
        >
          <Text style={styles.greeting}>Hello, I'm</Text>
          <Text style={styles.heroName}>Pavneesh</Text>
          <Text style={styles.heroRole}>
            Psychic, Astro Guru,{'\n'}Spiritual Personal Advisor
          </Text>
          <GradientButton
            title="Book Consultation"
            onPress={() => navigation.navigate('Booking')}
            style={styles.heroBtn}
          />
          <Text style={styles.heroEmoji}>🧘</Text>
        </LinearGradient>

        {/* Specialties */}
        <Text style={styles.sectionTitle}>My Specializations</Text>
        <View style={styles.specialGrid}>
          {specialties.map((s, i) => (
            <TouchableOpacity
              key={i}
              style={styles.specialCard}
              onPress={() => navigation.navigate('Services')}
              activeOpacity={0.8}
            >
              <View style={styles.specialIconWrap}>
                <Text style={styles.specialIcon}>{s.icon}</Text>
              </View>
              <Text style={styles.specialLabel}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Why Choose Me */}
        <Text style={styles.sectionTitle}>Why Choose Me?</Text>
        <LinearGradient
          colors={[Colors.gradientSoftStart, Colors.gradientSoftEnd]}
          style={styles.whyCard}
        >
          <Text style={styles.whyIcon}>⭐</Text>
          <Text style={styles.whyText}>
            20+ Years of Experience in Spiritual Guidance
          </Text>
        </LinearGradient>

        <View style={{ height: 20 }} />
        </ScrollView>
      </SafeAreaView>
    </ResponsiveScreen>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
  },
  menuIcon: { fontSize: 22, color: Colors.text },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  logoEmoji: { fontSize: 16 },
  logoText: {
    fontFamily: 'serif',
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  notifBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.gradientSoftStart,
    alignItems: 'center', justifyContent: 'center',
  },
  notifIcon: { fontSize: 18 },
  notifDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.primary,
    position: 'absolute', top: 6, right: 6,
    borderWidth: 2, borderColor: Colors.surface,
  },
  hero: {
    padding: 22,
    paddingBottom: 30,
    position: 'relative',
    overflow: 'hidden',
  },
  greeting: { fontSize: 14, color: Colors.textMuted, marginBottom: 2 },
  heroName: {
    fontFamily: 'serif',
    fontSize: 32,
    fontWeight: '700',
    color: Colors.primary,
    lineHeight: 36,
    marginBottom: 8,
  },
  heroRole: {
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
    marginBottom: 20,
  },
  heroBtn: { alignSelf: 'flex-start', marginBottom: 8 },
  heroEmoji: {
    fontSize: 90,
    position: 'absolute',
    right: 0,
    bottom: 0,
    opacity: 0.4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginHorizontal: 22,
    marginTop: 22,
    marginBottom: 14,
  },
  specialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 22,
    gap: 12,
  },
  specialCard: {
    width: '30%',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 6,
    ...Shadows.card,
  },
  specialIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.gradientSoftStart,
    alignItems: 'center', justifyContent: 'center',
  },
  specialIcon: { fontSize: 20 },
  specialLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.text,
    textAlign: 'center',
  },
  whyCard: {
    marginHorizontal: 22,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  whyIcon: { fontSize: 24 },
  whyText: { fontSize: 13, color: Colors.text, fontWeight: '500', flex: 1 },
});

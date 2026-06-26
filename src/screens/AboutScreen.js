import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, SafeAreaView, StatusBar,
} from 'react-native';
import LinearGradient from '../components/LinearGradient';
import ResponsiveScreen from '../components/ResponsiveScreen';
import { Colors, Shadows } from '../theme/colors';
import GradientButton from '../components/GradientButton';

export default function AboutScreen({ navigation }) {
  return (
    <ResponsiveScreen backgroundColor={Colors.bg}>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
        <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header Gradient */}
        <LinearGradient
          colors={[Colors.gradientStart, Colors.gradientEnd]}
          style={styles.header}
        >
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => navigation.navigate('Home')}>
              <Text style={styles.back}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>About Me</Text>
            <View style={{ width: 30 }} />
          </View>

          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarEmoji}>👨‍💼</Text>
            </View>
          </View>
          <Text style={styles.name}>Pavneesh</Text>
          <Text style={styles.role}>Psychic, Astro Guru, Spiritual Personal Advisor</Text>
        </LinearGradient>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>20+</Text>
            <Text style={styles.statLabel}>Years Exp.</Text>
          </View>
          <View style={[styles.statItem, styles.statBorder]}>
            <Text style={styles.statValue}>100K+</Text>
            <Text style={styles.statLabel}>Happy Clients</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>4.9 ⭐</Text>
            <Text style={styles.statLabel}>Ratings</Text>
          </View>
        </View>

        {/* Body */}
        <View style={styles.body}>
          <Text style={styles.sectionTitle}>About Me</Text>
          <Text style={styles.bodyText}>
            With over two decades of experience in spiritual guidance, astrology, and energy healing,
            I have helped thousands of people find clarity, peace, and success in their lives.
          </Text>
          <Text style={styles.bodyText}>
            My mission is to guide you with accurate insights and positive energy. Every reading is
            conducted with complete dedication and spiritual focus.
          </Text>
          <Text style={styles.sectionTitle}>My Approach</Text>
          <Text style={styles.bodyText}>
            I combine ancient wisdom with modern understanding to provide personalized spiritual
            guidance that truly resonates with your unique life journey.
          </Text>
          <GradientButton
            title="Book a Session"
            onPress={() => navigation.navigate('Booking')}
            style={{ marginTop: 8 }}
          />
        </View>
          <View style={{ height: 24 }} />
        </ScrollView>
      </SafeAreaView>
    </ResponsiveScreen>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingBottom: 32 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 20,
  },
  back: { fontSize: 28, color: 'white', fontWeight: '300' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: 'white' },
  avatarWrap: { alignItems: 'center' },
  avatar: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 3, borderColor: 'white',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 44 },
  name: {
    fontFamily: 'serif',
    fontSize: 26,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    marginTop: 12,
  },
  role: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 32,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    marginHorizontal: 22,
    borderRadius: 16,
    marginTop: -20,
    ...Shadows.lg,
    overflow: 'hidden',
  },
  statItem: {
    flex: 1, paddingVertical: 16,
    alignItems: 'center',
  },
  statBorder: {
    borderLeftWidth: 1, borderRightWidth: 1,
    borderColor: Colors.border,
  },
  statValue: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  statLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  body: { padding: 22, marginTop: 8 },
  sectionTitle: {
    fontSize: 15, fontWeight: '700',
    color: Colors.text, marginBottom: 10, marginTop: 4,
  },
  bodyText: {
    fontSize: 13, color: '#555',
    lineHeight: 22, marginBottom: 14,
  },
});

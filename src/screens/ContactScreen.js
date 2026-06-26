import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, SafeAreaView, StatusBar, Alert,
} from 'react-native';
import LinearGradient from '../components/LinearGradient';
import ResponsiveScreen from '../components/ResponsiveScreen';
import { Colors, Shadows } from '../theme/colors';

const contacts = [
  { icon: '📞', title: 'Phone', value: '+91 98765 43210' },
  { icon: '✉️', title: 'Email', value: 'info@evdivine.com' },
  { icon: '💬', title: 'WhatsApp', value: '+91 98765 43210' },
  { icon: '📍', title: 'Address', value: '123, Divine Street, New Delhi, India – 110001' },
];

const socials = [
  { icon: 'f', color: '#1877F2', name: 'Facebook' },
  { icon: '📸', color: '#E1306C', name: 'Instagram' },
  { icon: '▶', color: '#FF0000', name: 'YouTube' },
  { icon: '💬', color: '#25D366', name: 'WhatsApp' },
];

export default function ContactScreen({ navigation }) {
  return (
    <ResponsiveScreen backgroundColor={Colors.bg}>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Contact Us</Text>
          <View style={{ width: 30 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[Colors.gradientSoftStart, Colors.gradientSoftEnd]}
          style={styles.hero}
        >
          <Text style={styles.heroTitle}>Get in Touch</Text>
          <Text style={styles.heroSub}>We are here to help you{'\n'}on your spiritual journey.</Text>
          <Text style={styles.heroEmoji}>🧘‍♀️</Text>
        </LinearGradient>

        <View style={styles.list}>
          {contacts.map((c, i) => (
            <View key={i} style={styles.contactItem}>
              <View style={styles.iconWrap}>
                <Text style={styles.icon}>{c.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactTitle}>{c.title}</Text>
                <Text style={styles.contactValue}>{c.value}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.socialSection}>
          <Text style={styles.socialTitle}>Follow Us</Text>
          <View style={styles.socialRow}>
            {socials.map((s, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.socialBtn, { backgroundColor: s.color }]}
                onPress={() => Alert.alert(`Opening ${s.name}...`)}
                activeOpacity={0.85}
              >
                <Text style={styles.socialIcon}>{s.icon}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
          <View style={{ height: 24 }} />
        </ScrollView>
      </SafeAreaView>
    </ResponsiveScreen>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22, paddingVertical: 14,
    backgroundColor: Colors.surface,
  },
  back: { fontSize: 28, color: Colors.text, fontWeight: '300' },
  pageTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  hero: {
    padding: 24, paddingBottom: 30,
    position: 'relative', overflow: 'hidden',
  },
  heroTitle: { fontSize: 24, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  heroSub: { fontSize: 13, color: Colors.textMuted, lineHeight: 20 },
  heroEmoji: {
    fontSize: 70, opacity: 0.25,
    position: 'absolute', right: 16, bottom: 0,
  },
  list: { padding: 22, gap: 14 },
  contactItem: {
    flexDirection: 'row', alignItems: 'center',
    gap: 14, backgroundColor: Colors.surface,
    borderRadius: 16, padding: 14, ...Shadows.card,
  },
  iconWrap: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.gradientSoftStart,
    alignItems: 'center', justifyContent: 'center',
  },
  icon: { fontSize: 20 },
  contactTitle: { fontSize: 12, color: Colors.textMuted, marginBottom: 2 },
  contactValue: { fontSize: 13, fontWeight: '700', color: Colors.text },
  socialSection: { paddingHorizontal: 22, paddingBottom: 8 },
  socialTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 14 },
  socialRow: { flexDirection: 'row', gap: 14 },
  socialBtn: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center',
  },
  socialIcon: { fontSize: 20, color: 'white' },
});

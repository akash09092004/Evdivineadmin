import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, SafeAreaView, StatusBar, Alert,
} from 'react-native';
import LinearGradient from '../components/LinearGradient';
import ResponsiveScreen from '../components/ResponsiveScreen';
import { Colors, Shadows } from '../theme/colors';

const menuItems = [
  { icon: '📅', label: 'My Bookings' },
  { icon: '📋', label: 'Booking History' },
  { icon: '👤', label: 'My Profile' },
  { icon: '💳', label: 'Payment Methods' },
  { icon: '🔔', label: 'Notifications' },
];

export default function ProfileScreen({ navigation }) {
  return (
    <ResponsiveScreen backgroundColor={Colors.bg}>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
        <ScrollView showsVerticalScrollIndicator={false}>

        {/* Top Bar */}
        <LinearGradient colors={[Colors.gradientStart, Colors.gradientEnd]}>
          <View style={styles.topBar}>
            <Text style={styles.menuIcon}>☰</Text>
            <View style={styles.logoRow}>
              <Text style={styles.logoEmoji}>🪷</Text>
              <Text style={styles.logoText}>Evdivine</Text>
            </View>
            <View style={styles.gearBtn}>
              <Text style={styles.gearIcon}>⚙️</Text>
            </View>
          </View>

          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarEmoji}>👨‍💼</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>Pavneesh</Text>
              <Text style={styles.phone}>+91 98765 43210</Text>
              <Text style={styles.email}>pavneesh@example.com</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Menu */}
        <View style={styles.menuList}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={styles.menuItem}
              onPress={() => Alert.alert(item.label)}
              activeOpacity={0.8}
            >
              <View style={styles.menuIcon2}>
                <Text style={styles.menuEmoji}>{item.icon}</Text>
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Contact')}
            activeOpacity={0.8}
          >
            <View style={styles.menuIcon2}>
              <Text style={styles.menuEmoji}>❓</Text>
            </View>
            <Text style={styles.menuLabel}>Help & Support</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Blocks')}
            activeOpacity={0.8}
          >
            <View style={styles.menuIcon2}>
              <Text style={styles.menuEmoji}>📄</Text>
            </View>
            <Text style={styles.menuLabel}>Legal & Info</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          {/* Logout */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              Alert.alert('Logout', 'Are you sure?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Logout', style: 'destructive', onPress: () => navigation.navigate('Login') },
              ]);
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.menuIcon2, { backgroundColor: '#FFF0F0' }]}>
              <Text style={styles.menuEmoji}>🚪</Text>
            </View>
            <Text style={[styles.menuLabel, { color: Colors.danger }]}>Logout</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>
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
    paddingTop: 14,
    paddingBottom: 4,
  },
  menuIcon: { fontSize: 22, color: 'white' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  logoEmoji: { fontSize: 16 },
  logoText: {
    fontFamily: 'serif',
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  gearBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  gearIcon: { fontSize: 18 },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 22,
    paddingTop: 10,
  },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 32 },
  name: { fontSize: 18, fontWeight: '700', color: 'white' },
  phone: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  email: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  menuList: { padding: 22, gap: 10 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    ...Shadows.card,
  },
  menuIcon2: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.gradientSoftStart,
    alignItems: 'center', justifyContent: 'center',
  },
  menuEmoji: { fontSize: 18 },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: Colors.text },
  chevron: { fontSize: 20, color: Colors.textMuted },
});

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, SafeAreaView, StatusBar, Alert,
} from 'react-native';
import LinearGradient from '../components/LinearGradient';
import ResponsiveScreen from '../components/ResponsiveScreen';
import { Colors, Shadows } from '../theme/colors';
import GradientButton from '../components/GradientButton';

const categories = [
  { icon: '♈', label: 'Astrology' },
  { icon: '🃏', label: 'Tarot' },
  { icon: '✋', label: 'Palm' },
  { icon: '🔢', label: 'Numerology' },
  { icon: '✨', label: 'Aura' },
];

const dates = [
  { day: 'Mon', num: '20', month: 'May' },
  { day: 'Tue', num: '21', month: 'May' },
  { day: 'Wed', num: '22', month: 'May' },
  { day: 'Thu', num: '23', month: 'May' },
  { day: 'Fri', num: '24', month: 'May' },
];

const times = ['10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '04:00 PM', '05:00 PM'];

const consultTypes = [
  { icon: '💬', name: 'Chat', desc: 'Start a chat session' },
  { icon: '📞', name: 'Call', desc: 'Talk on a phone call' },
  { icon: '🎥', name: 'Video Call', desc: 'Face to face video call' },
];

export default function BookingScreen({ navigation }) {
  const [selCat, setSelCat] = useState(0);
  const [selDate, setSelDate] = useState(1);
  const [selTime, setSelTime] = useState(1);
  const [selConsult, setSelConsult] = useState(1);

  return (
    <ResponsiveScreen backgroundColor={Colors.bg}>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.navigate('Services')}>
            <Text style={styles.back}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Book Consultation</Text>
          <View style={{ width: 30 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Category */}
        <Text style={styles.label}>Choose Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow}>
          {categories.map((c, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setSelCat(i)}
              style={[styles.catChip, selCat === i && styles.catChipActive]}
            >
              <Text style={styles.catIcon}>{c.icon}</Text>
              <Text style={[styles.catLabel, selCat === i && styles.catLabelActive]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Date */}
        <Text style={styles.label}>Select Date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateRow}>
          {dates.map((d, i) => (
            <TouchableOpacity key={i} onPress={() => setSelDate(i)} activeOpacity={0.8}>
              {selDate === i ? (
                <LinearGradient
                  colors={[Colors.gradientStart, Colors.gradientEnd]}
                  style={styles.dateChip}
                >
                  <Text style={[styles.dateDay, { color: 'white' }]}>{d.day}</Text>
                  <Text style={[styles.dateNum, { color: 'white' }]}>{d.num}</Text>
                  <Text style={[styles.dateMonth, { color: 'rgba(255,255,255,0.8)' }]}>{d.month}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.dateChip}>
                  <Text style={styles.dateDay}>{d.day}</Text>
                  <Text style={styles.dateNum}>{d.num}</Text>
                  <Text style={styles.dateMonth}>{d.month}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Time */}
        <Text style={styles.label}>Select Time</Text>
        <View style={styles.timeGrid}>
          {times.map((t, i) => (
            <TouchableOpacity key={i} onPress={() => setSelTime(i)} activeOpacity={0.8}>
              {selTime === i ? (
                <LinearGradient
                  colors={[Colors.gradientStart, Colors.gradientEnd]}
                  style={styles.timeChip}
                >
                  <Text style={[styles.timeText, { color: 'white' }]}>{t}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.timeChip}>
                  <Text style={styles.timeText}>{t}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Consultation Type */}
        <Text style={styles.label}>Consultation Type</Text>
        {consultTypes.map((c, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => setSelConsult(i)}
            style={[styles.consultCard, selConsult === i && styles.consultCardActive]}
          >
            <View style={[styles.radio, selConsult === i && styles.radioActive]}>
              {selConsult === i && <View style={styles.radioDot} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.consultName}>{c.icon} {c.name}</Text>
              <Text style={styles.consultDesc}>{c.desc}</Text>
            </View>
          </TouchableOpacity>
        ))}

        <GradientButton
          title="Continue to Payment"
          onPress={() => Alert.alert('✨ Booking Confirmed!', 'Your consultation has been booked successfully.')}
          style={{ marginTop: 8 }}
        />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: 14,
    backgroundColor: Colors.bg,
  },
  back: { fontSize: 28, color: Colors.text, fontWeight: '300' },
  pageTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  content: { padding: 22 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.text, marginBottom: 12, marginTop: 4 },
  catRow: { marginBottom: 22, flexGrow: 0 },
  catChip: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    marginRight: 10,
  },
  catChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.gradientSoftStart,
  },
  catIcon: { fontSize: 22 },
  catLabel: { fontSize: 11, fontWeight: '500', color: Colors.textMuted },
  catLabelActive: { color: Colors.primary },
  dateRow: { marginBottom: 22, flexGrow: 0 },
  dateChip: {
    minWidth: 54,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    marginRight: 8,
  },
  dateDay: { fontSize: 10, color: Colors.textMuted, marginBottom: 2 },
  dateNum: { fontSize: 16, fontWeight: '700', color: Colors.text },
  dateMonth: { fontSize: 10, color: Colors.textMuted, marginTop: 1 },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 22,
  },
  timeChip: {
    width: '31%',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  timeText: { fontSize: 12, fontWeight: '500', color: Colors.text },
  consultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    marginBottom: 10,
  },
  consultCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.gradientSoftStart,
  },
  radio: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: Colors.primary },
  radioDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  consultName: { fontSize: 13, fontWeight: '700', color: Colors.text },
  consultDesc: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
});

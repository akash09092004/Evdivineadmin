import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, SafeAreaView, StatusBar, Alert,
} from 'react-native';
import ResponsiveScreen from '../components/ResponsiveScreen';
import { Colors, Shadows } from '../theme/colors';

const blocks = [
  { icon: '❓', title: 'FAQ', sub: 'Frequently Asked Questions' },
  { icon: '📜', title: 'Terms & Condition', sub: 'Read our terms and conditions' },
  { icon: '🔒', title: 'Privacy Policy', sub: 'Learn about our privacy policy' },
  { icon: '✅', title: 'Satisfaction Guarantee', sub: 'Our commitment to you' },
];

export default function BlocksScreen({ navigation }) {
  return (
    <ResponsiveScreen backgroundColor={Colors.bg}>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Legal & Info</Text>
          <View style={{ width: 30 }} />
        </View>

        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {blocks.map((b, i) => (
          <TouchableOpacity
            key={i}
            style={styles.block}
            onPress={() => Alert.alert(b.title, b.sub)}
            activeOpacity={0.8}
          >
            <View style={styles.iconWrap}>
              <Text style={styles.icon}>{b.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{b.title}</Text>
              <Text style={styles.sub}>{b.sub}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}
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
  list: { padding: 22, gap: 12 },
  block: {
    flexDirection: 'row', alignItems: 'center',
    gap: 14, backgroundColor: Colors.surface,
    borderRadius: 16, padding: 16, ...Shadows.card,
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.gradientSoftStart,
    alignItems: 'center', justifyContent: 'center',
  },
  icon: { fontSize: 20 },
  title: { fontSize: 14, fontWeight: '700', color: Colors.text },
  sub: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  chevron: { fontSize: 20, color: Colors.textMuted },
});

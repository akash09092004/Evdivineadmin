import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, SafeAreaView,
  StatusBar, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import ResponsiveScreen from '../components/ResponsiveScreen';
import { Colors } from '../theme/colors';
import GradientButton from '../components/GradientButton';

export default function SignupScreen({ navigation }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [agreed, setAgreed] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSignup = () => {
    if (!agreed) { Alert.alert('Please agree to Terms & Conditions'); return; }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert('🎉 Account Created!', 'Welcome to Evdivine!', [
        { text: 'OK', onPress: () => navigation.navigate('MainTabs') },
      ]);
    }, 1000);
  };

  return (
    <ResponsiveScreen backgroundColor={Colors.surface}>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.back}>‹</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to get started</Text>

          {[
            { key: 'name', label: 'Full Name', placeholder: 'Enter your full name', type: 'default' },
            { key: 'email', label: 'Email', placeholder: 'Enter your email', type: 'email-address' },
            { key: 'phone', label: 'Phone', placeholder: 'Enter your phone number', type: 'phone-pad' },
          ].map(field => (
            <View key={field.key} style={styles.formGroup}>
              <Text style={styles.label}>{field.label}</Text>
              <TextInput
                style={styles.input}
                placeholder={field.placeholder}
                placeholderTextColor={Colors.textMuted}
                keyboardType={field.type}
                autoCapitalize={field.key === 'name' ? 'words' : 'none'}
                value={form[field.key]}
                onChangeText={val => setForm({ ...form, [field.key]: val })}
              />
            </View>
          ))}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={[styles.input, { paddingRight: 44 }]}
                placeholder="Create a password"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry={!showPw}
                value={form.password}
                onChangeText={val => setForm({ ...form, password: val })}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPw(!showPw)}>
                <Text>{showPw ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => setAgreed(!agreed)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkbox, agreed && styles.checkboxActive]}>
              {agreed && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkText}>
              I agree to the{' '}
              <Text style={styles.checkLink}>Terms & Conditions</Text>
              {' '}and{' '}
              <Text style={styles.checkLink}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>

          <GradientButton
            title={loading ? 'Creating account...' : 'Sign Up'}
            onPress={handleSignup}
            loading={loading}
          />

          <Text style={[styles.footer, { marginTop: 16 }]}>
            Already have an account?{' '}
            <Text style={styles.footerLink} onPress={() => navigation.navigate('Login')}>
              Login
            </Text>
          </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ResponsiveScreen>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  topBar: { paddingHorizontal: 22, paddingVertical: 10 },
  back: { fontSize: 28, color: Colors.text, fontWeight: '300' },
  content: { padding: 24, paddingTop: 4 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: Colors.textMuted, marginBottom: 28 },
  formGroup: { marginBottom: 18 },
  label: { fontSize: 12, fontWeight: '700', color: Colors.text, marginBottom: 7 },
  input: {
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: 10, padding: 13,
    fontSize: 14, color: Colors.text,
    backgroundColor: Colors.surface,
  },
  inputWrap: { position: 'relative' },
  eyeBtn: {
    position: 'absolute', right: 12,
    top: 0, bottom: 0, justifyContent: 'center',
  },
  checkRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 10, marginBottom: 22,
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 4,
    borderWidth: 2, borderColor: Colors.border,
    marginTop: 1, alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkmark: { color: 'white', fontSize: 12, fontWeight: '700' },
  checkText: { flex: 1, fontSize: 12, color: Colors.textMuted, lineHeight: 20 },
  checkLink: { color: Colors.primary, fontWeight: '700' },
  footer: { textAlign: 'center', fontSize: 13, color: Colors.textMuted },
  footerLink: { color: Colors.primary, fontWeight: '700' },
});

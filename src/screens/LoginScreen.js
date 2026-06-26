import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, SafeAreaView,
  StatusBar, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import ResponsiveScreen from '../components/ResponsiveScreen';
import { Colors } from '../theme/colors';
import GradientButton from '../components/GradientButton';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert('✨ Login Successful!', 'Welcome back!', [
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
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Login to your account</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email or Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email or phone"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={[styles.input, { paddingRight: 44 }]}
                placeholder="Enter your password"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry={!showPw}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPw(!showPw)}>
                <Text>{showPw ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity onPress={() => Alert.alert('Reset link sent to your email!')}>
            <Text style={styles.forgotLink}>Forgot Password?</Text>
          </TouchableOpacity>

          <GradientButton
            title={loading ? 'Logging in...' : 'Login'}
            onPress={handleLogin}
            loading={loading}
          />

          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>or continue with</Text>
            <View style={styles.orLine} />
          </View>

          <View style={styles.socialRow}>
            <TouchableOpacity
              style={styles.socialBtn}
              onPress={() => Alert.alert('Google Sign In')}
            >
              <Text style={styles.socialBtnText}>G  Google</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialBtn}
              onPress={() => Alert.alert('Apple Sign In')}
            >
              <Text style={styles.socialBtnText}>🍎  Apple</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>
            Don't have an account?{' '}
            <Text style={styles.footerLink} onPress={() => navigation.navigate('Signup')}>
              Sign Up
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
  topBar: {
    paddingHorizontal: 22, paddingVertical: 10,
  },
  back: { fontSize: 28, color: Colors.text, fontWeight: '300' },
  content: { padding: 24, paddingTop: 4 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: Colors.textMuted, marginBottom: 28 },
  formGroup: { marginBottom: 18 },
  label: {
    fontSize: 12, fontWeight: '700',
    color: Colors.text, marginBottom: 7,
  },
  input: {
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: 10,
    padding: 13, fontSize: 14,
    color: Colors.text, backgroundColor: Colors.surface,
  },
  inputWrap: { position: 'relative' },
  eyeBtn: {
    position: 'absolute', right: 12,
    top: 0, bottom: 0, justifyContent: 'center',
  },
  forgotLink: {
    color: Colors.primary,
    fontSize: 13, fontWeight: '700',
    textAlign: 'right',
    marginBottom: 22, marginTop: -10,
  },
  orRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, marginBottom: 16, marginTop: 4,
  },
  orLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  orText: { fontSize: 12, color: Colors.textMuted },
  socialRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  socialBtn: {
    flex: 1, padding: 13,
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: 50, alignItems: 'center',
  },
  socialBtnText: { fontSize: 13, fontWeight: '500', color: Colors.text },
  footer: { textAlign: 'center', fontSize: 13, color: Colors.textMuted },
  footerLink: { color: Colors.primary, fontWeight: '700' },
});

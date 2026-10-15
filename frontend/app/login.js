import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

// ── กำหนด API URL ──────────────────────────────────────────────────────────
// เชื่อมต่อ Backend บนเซิร์ฟเวอร์มหาลัย (พอร์ต 3032) ที่ต่อกับ phpMyAdmin โดยตรง
const API_BASE = 'http://119.59.102.161:3032';

export default function LoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    const u = username.trim();
    const p = password.trim();

    if (!u || !p) {
      setError('กรุณากรอก Username และ Password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        await AsyncStorage.setItem('token', data.token);
        await AsyncStorage.setItem('user', JSON.stringify(data.user || { username: u }));
        router.replace('/');
      } else {
        setError(data.message || 'Invalid username or password');
      }
    } catch (e) {
      setError('ไม่สามารถเชื่อมต่อ Server ได้\nตรวจสอบว่า Backend รันอยู่ที่ ' + API_BASE);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0f0f1a" />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo / Header */}
        <View style={styles.logoArea}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoEmoji}>👥</Text>
          </View>
          <Text style={styles.appTitle}>HR Manager</Text>
          <Text style={styles.appSubtitle}>Salary Analytics System</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>เข้าสู่ระบบ</Text>
          <Text style={styles.cardHint}>ใช้ admin / password123</Text>

          {/* Error Banner */}
          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Username */}
          <Text style={styles.label}>Username</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputIcon}>👤</Text>
            <TextInput
              style={styles.input}
              placeholder="กรอก Username"
              placeholderTextColor="#4a4a6a"
              value={username}
              onChangeText={(t) => { setUsername(t); setError(''); }}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          {/* Password */}
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputIcon}>🔒</Text>
            <TextInput
              style={styles.input}
              placeholder="กรอก Password"
              placeholderTextColor="#4a4a6a"
              value={password}
              onChangeText={(t) => { setPassword(t); setError(''); }}
              secureTextEntry={!showPass}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
              <Text style={styles.eyeIcon}>{showPass ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.loginBtnText}>เข้าสู่ระบบ →</Text>
            )}
          </TouchableOpacity>

          {/* Hint */}
          <View style={styles.hintBox}>
            <Text style={styles.hintText}>
              Demo credentials:{'\n'}
              Username: <Text style={styles.hintBold}>admin</Text>  Password: <Text style={styles.hintBold}>password123</Text>
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>HR Manager & Salary Analytics © 2026</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0f0f1a' },

  container: {
    flexGrow: 1,
    backgroundColor: '#0f0f1a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },

  // Logo
  logoArea: { alignItems: 'center', marginBottom: 36 },
  logoIcon: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: '#1e1e3a',
    borderWidth: 2, borderColor: '#6366f1',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 20,
    elevation: 12,
  },
  logoEmoji: { fontSize: 36 },
  appTitle: { fontSize: 28, fontWeight: '800', color: '#ffffff', letterSpacing: 0.5 },
  appSubtitle: { fontSize: 13, color: '#6366f1', marginTop: 4, fontWeight: '500' },

  // Card
  card: {
    width: '100%', maxWidth: 420,
    backgroundColor: '#16162a',
    borderRadius: 20,
    borderWidth: 1, borderColor: '#2a2a4a',
    padding: 28,
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 24,
    elevation: 8,
  },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#ffffff', marginBottom: 4 },
  cardHint: { fontSize: 12, color: '#6366f1', marginBottom: 24 },

  // Error
  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#2d1515', borderRadius: 10,
    borderWidth: 1, borderColor: '#ef4444',
    padding: 12, marginBottom: 16,
  },
  errorIcon: { fontSize: 14 },
  errorText: { flex: 1, color: '#fca5a5', fontSize: 13, lineHeight: 18 },

  // Inputs
  label: { fontSize: 13, fontWeight: '600', color: '#a0a0c0', marginBottom: 8, marginTop: 16 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0f0f1a',
    borderRadius: 12, borderWidth: 1, borderColor: '#2a2a4a',
    paddingHorizontal: 14, height: 52,
  },
  inputIcon: { fontSize: 16, marginRight: 10 },
  input: { flex: 1, color: '#ffffff', fontSize: 15 },
  eyeBtn: { padding: 4 },
  eyeIcon: { fontSize: 16 },

  // Button
  loginBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 14, height: 54,
    justifyContent: 'center', alignItems: 'center',
    marginTop: 28,
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12,
    elevation: 6,
  },
  loginBtnDisabled: { backgroundColor: '#3a3a6a', shadowOpacity: 0 },
  loginBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },

  // Hint box
  hintBox: {
    marginTop: 20, backgroundColor: '#0f0f1a',
    borderRadius: 10, borderWidth: 1, borderColor: '#2a2a4a',
    padding: 14, alignItems: 'center',
  },
  hintText: { color: '#6a6a8a', fontSize: 12, textAlign: 'center', lineHeight: 20 },
  hintBold: { color: '#6366f1', fontWeight: '700' },

  footer: { color: '#2a2a4a', fontSize: 11, marginTop: 32 },
});

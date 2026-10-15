import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    async function evaluateAuth() {
      try {
        const token = await AsyncStorage.getItem('token');
        const hasToken = !!token;
        setIsLoggedIn(hasToken);
        const inAuthGroup = segments[0] === 'login';
        if (!hasToken && !inAuthGroup) {
          router.replace('/login');
        } else if (hasToken && inAuthGroup) {
          router.replace('/');
        }
      } catch {
        setIsLoggedIn(false);
      } finally {
        setIsReady(true);
      }
    }
    evaluateAuth();
  }, [segments]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0f0f1a', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="index" />
    </Stack>
  );
}

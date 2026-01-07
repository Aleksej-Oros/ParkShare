import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router, useSegments } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile.realtime';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
const {
  isOnboarded,
  loading: profileLoading,
} = useProfile(user?.uid ?? null);

  const segments = useSegments();

  const loading = authLoading || profileLoading;
  const segment = segments[0]; // 'auth', 'onboarding', 'map', ...

  useEffect(() => {
    if (loading) return;

    // ❌ Not logged in → auth
    if (!user) {
      if (segment !== 'auth') {
        router.replace('/auth/login');
      }
      return;
    }

    // ⏳ Logged in but NOT onboarded → onboarding
    if (!isOnboarded) {
      if (segment !== 'onboarding') {
        router.replace('/onboarding');
      }
      return;
    }

    // ✅ Logged in + onboarded
    // Allow tabs AND modal routes (map/add, map/edit)
    if (segment !== '(tabs)' && segment !== 'map') {
      router.replace('/');
    }
  }, [user, isOnboarded, loading, segment]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

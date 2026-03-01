import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router, useSegments, usePathname } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile.realtime';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { isOnboarded, loading: profileLoading } = useProfile(
    user?.uid ?? null
  );

  const segments = useSegments();
  const pathname = usePathname();

  const loading = authLoading || profileLoading;

  useEffect(() => {
    if (loading) {
      return;
    }

    // Compute route state from current segments (inside effect to avoid stale closures)
    const isInAuth = segments.some(s => s === 'auth');
    const isInOnboarding = segments.some(s => s === 'onboarding');
    const isInTabs = segments.some(s => s === '(tabs)');
    const isInMapModal = segments.some(s => s === 'map');

    // Additional check: verify pathname starts with expected route
    // This prevents race conditions where segments haven't updated yet
    const pathnameStartsWithOnboarding = pathname.startsWith('/onboarding');
    const isPublicResetRoute = pathname.startsWith('/reset-password');
    // First-time flow: onboarding confirm navigates to tutorial; profile may still show isOnboarded false (listener delay)
    const isOnTutorialModal = pathname.startsWith('/tutorial-modal');

    // Allow password reset links for both authenticated and unauthenticated users.
    if (isPublicResetRoute) {
      return;
    }

    // ❌ Not logged in → auth
    if (!user) {
      if (!isInAuth) {
        router.replace('/auth/login');
      }
      return;
    }

    // ⏳ Logged in but NOT onboarded → onboarding
    if (!isOnboarded) {
      // Allow /onboarding/* and /tutorial-modal (post-onboarding first-time tutorial). Do not redirect away from tutorial.
      if (!isInOnboarding && !pathnameStartsWithOnboarding && !isOnTutorialModal) {
        router.replace('/onboarding');
      }
      return;
    }

    // ✅ Logged in + onboarded → main app
    // Only redirect if user is in auth/onboarding (not in tabs or modals).
    // When on onboarding/confirm, do NOT redirect: confirm screen will navigate to /tutorial-modal (first-time flow).
    const isOnOnboardingConfirm = pathname === '/onboarding/confirm' || pathname.startsWith('/onboarding/confirm');
    if (isInAuth || isInOnboarding) {
      if (!isInTabs && !isInMapModal && !isOnOnboardingConfirm) {
        router.replace('/');
      }
    }
  }, [
    user,
    isOnboarded,
    loading,
    segments, // Use raw segments array, not computed booleans
    pathname, // Include pathname to detect route changes and handle async updates
  ]);

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

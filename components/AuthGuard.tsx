// AuthGuard: Protects routes based on authentication status and profile completion
// Redirects unauthenticated users to /auth/login
// Redirects authenticated users without profile to /onboarding
// Redirects authenticated users with profile to /(tabs)
// CRITICAL: Uses ONLY Expo Router paths - NO React Navigation API
// CRITICAL: Waits for router to be ready before navigating
import React, { useEffect, useRef } from 'react';
import { router, useRootNavigationState } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const { loading: profileLoading, isOnboarded } = useProfile();
  const navigationState = useRootNavigationState();
  const hasNavigatedRef = useRef(false);

  const loading = authLoading || profileLoading;
  const isRouterReady = navigationState?.key != null;

  useEffect(() => {
    // Wait for router to be ready AND auth/profile state to be determined
    if (loading || !isRouterReady) {
      return;
    }

    // Prevent duplicate navigation calls
    if (hasNavigatedRef.current) {
      return;
    }

    // SINGLE SOURCE OF TRUTH: Only AuthGuard makes routing decisions
    // Uses ONLY Expo Router paths - NO pathname checks, NO segments, NO React Navigation API
    
    if (!user) {
      // User not authenticated → redirect to login
      hasNavigatedRef.current = true;
      router.replace('/auth/login');
      return;
    }

    if (user && !isOnboarded) {
      // User is authenticated but not onboarded → redirect to onboarding
      hasNavigatedRef.current = true;
      router.replace('/onboarding');
      return;
    }

    if (user && isOnboarded) {
      // User is authenticated and onboarded → redirect to tabs
      hasNavigatedRef.current = true;
      router.replace('/(tabs)');
      return;
    }
  }, [user, loading, isOnboarded, isRouterReady]);

  // Reset navigation flag when user or onboarding state changes
  useEffect(() => {
    hasNavigatedRef.current = false;
  }, [user, isOnboarded]);

  // Show loading spinner while auth/profile state is being determined
  // CRITICAL: This prevents the Stack from rendering until we know the auth/profile state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2f95dc" />
      </View>
    );
  }

  // Render children once auth/profile state is determined
  // The redirect in useEffect will handle navigation
  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});


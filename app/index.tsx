/**
 * Root index route
 * Redirects to tabs - actual routing is handled by AuthGuard
 */
import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect to tabs - AuthGuard will handle auth/onboarding routing
  return <Redirect href="/(tabs)" />;
}

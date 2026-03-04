import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { store } from '@/store';
import AuthGuard from '@/components/AuthGuard';
import { LocaleProvider } from '@/context/LocaleContext';
import { resolveAppLanguage, initI18n } from '@/localization/i18n';

import { useColorScheme } from '@/components/useColorScheme';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';


// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false);
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  // Bootstrap i18n: resolve language (AsyncStorage → device locale → en), then init before rendering UI.
  useEffect(() => {
    if (!loaded) return;
    let cancelled = false;
    resolveAppLanguage()
      .then((lng) => {
        if (cancelled) return;
        initI18n(lng);
        setI18nReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          initI18n('en');
          setI18nReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [loaded]);

  useEffect(() => {
    if (loaded && i18nReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loaded, i18nReady]);

  if (!loaded || !i18nReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <Provider store={store}>
        <AuthGuard>
          <LocaleProvider>
            <RootLayoutNav />
          </LocaleProvider>
        </AuthGuard>
      </Provider>
    </GestureHandlerRootView>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme() ?? 'dark'; // Default to dark mode

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          gestureEnabled: false,
          fullScreenGestureEnabled: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="reset-password" options={{ headerShown: false }} />
        <Stack.Screen 
          name="onboarding" 
          options={{ 
            headerShown: false,
            gestureEnabled: false,
            fullScreenGestureEnabled: false,
          }} 
        />

        <Stack.Screen
          name="map/add"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="map/edit"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="modal"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="tutorial-modal"
          options={{
            presentation: 'modal',
            animation: 'fade_from_bottom',
            gestureEnabled: false,
            headerShown: false,
          }}
        />
    </Stack>

    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
/**
 * Onboarding Welcome Screen
 * Layout: Content area (flex: 1) centers content, Footer (flexShrink: 0) sits below with its own touch area
 */
import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text as ThemedText, useThemeColor } from '@/components/Themed';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'dark';
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const tintColor = Colors[colorScheme].tint;

  const handleGetStarted = () => {
    router.push('/onboarding/username');
  };

  const footerPaddingBottom = Math.max(insets.bottom, 24);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['left', 'right', 'bottom']}>
      {/* Content area - keep it separate from footer to avoid touch interception */}
      <View
        style={[styles.content, { paddingBottom: footerPaddingBottom + 8 }]}
      >
        <View style={styles.contentInner}>
          <View style={[styles.iconContainer, { backgroundColor: tintColor + '20' }]}>
            <Ionicons name="car" size={80} color={tintColor} />
          </View>

          <ThemedText style={[styles.title, { color: tintColor }]}>Welcome to ParkShare!</ThemedText>

          <ThemedText style={[styles.subtitle, { color: textSecondaryColor }]}>
            Join the community of drivers sharing parking spots in real-time.
          </ThemedText>

          <Card style={{ width: '100%', borderColor: tintColor + '55' }}>
            <View style={styles.features}>
              <Feature icon="map" text="Find nearby parking spots" tintColor={tintColor} textColor={textColor} />
              <Feature icon="share" text="Share spots with others" tintColor={tintColor} textColor={textColor} />
              <Feature icon="bookmark" text="Reserve your spot ahead of time" tintColor={tintColor} textColor={textColor} />
              <Feature icon="pricetag" text="Earn discounts by sharing" tintColor={tintColor} textColor={textColor} />
              <Feature icon="navigate" text="Navigate to available parking" tintColor={tintColor} textColor={textColor} />
            </View>
          </Card>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: footerPaddingBottom + 24, backgroundColor }]}>
        <Button
          title="Get Started"
          onPress={handleGetStarted}
          variant="primary"
          style={styles.button}
        />
      </View>
    </SafeAreaView>
  );
}

function Feature({ icon, text, tintColor, textColor }: { icon: any; text: string; tintColor: string; textColor: string }) {
  return (
    <View style={styles.feature}>
      <Ionicons name={icon} size={24} color={tintColor} />
      <Text style={[styles.featureText, { color: textColor }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  contentInner: {
    width: '100%',
    alignItems: 'center',
  },
  footer: {
    paddingHorizontal: 32,
    paddingTop: 20,
  },

  iconContainer: {
    marginBottom: 32,
    padding: 24,
    borderRadius: 60,
  },

  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 24,
  },

  features: {
    width: '100%',
    gap: 20,
  },

  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  featureText: {
    fontSize: 16,
  },

  button: {
    width: '100%',
  },
});


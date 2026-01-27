/**
 * Onboarding Welcome Screen
 * Layout: Content area (flex: 1) centers content, Footer (flexShrink: 0) sits below with its own touch area
 */
import React from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();

  const handleGetStarted = () => {
    router.push('/onboarding/username');
  };

  const footerPaddingBottom = Math.max(insets.bottom, 24);

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      {/* Content area - keep it separate from footer to avoid touch interception */}
      <View
        style={[styles.content, { paddingBottom: footerPaddingBottom + 24 }]}
      >
        <View style={styles.contentInner}>
          <View style={styles.iconContainer}>
            <Ionicons name="car" size={80} color="#2f95dc" />
          </View>

          <Text style={styles.title}>Welcome to ParkShare!</Text>

          <Text style={styles.subtitle}>
            Join the community of drivers sharing parking spots in real-time.
          </Text>

          <View style={styles.features}>
            <Feature icon="map" text="Find nearby parking spots" />
            <Feature icon="share" text="Share spots with others" />
            <Feature icon="trophy" text="Earn Park Points" />
          </View>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: footerPaddingBottom + 24 }]}>
        <Pressable
          onPress={handleGetStarted}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
          hitSlop={12}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>
            Get Started
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Feature({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.feature}>
      <Ionicons name={icon} size={24} color="#2f95dc" />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  content: {
    flex: 1,
    justifyContent: 'center',
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
    backgroundColor: '#fff',
  },

  iconContainer: {
    marginBottom: 32,
    padding: 24,
    backgroundColor: '#f0f8ff',
    borderRadius: 60,
  },

  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2f95dc',
    marginBottom: 16,
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 24,
  },

  features: {
    width: '100%',
    gap: 24,
  },

  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  featureText: {
    fontSize: 16,
    color: '#333',
  },

  button: {
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: '#2f95dc',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 56,
  },
  buttonPressed: {
    opacity: 0.85,
  },

  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});


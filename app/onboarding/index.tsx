/**
 * Onboarding Welcome Screen
 * First screen in the onboarding flow
 */
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';

export default function WelcomeScreen() {
  const handleGetStarted = () => {
    router.push('/onboarding/username');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="car" size={80} color="#2f95dc" />
        </View>
        
        <Text style={styles.title}>Welcome to ParkShare!</Text>
        
        <Text style={styles.subtitle}>
          Join the community of drivers sharing parking spots in real-time.
        </Text>

        <View style={styles.features}>
          <View style={styles.feature}>
            <Ionicons name="map" size={24} color="#2f95dc" />
            <Text style={styles.featureText}>Find nearby parking spots</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="share" size={24} color="#2f95dc" />
            <Text style={styles.featureText}>Share spots with others</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="trophy" size={24} color="#2f95dc" />
            <Text style={styles.featureText}>Earn Park Points</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={handleGetStarted}>
          <Text style={styles.buttonText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.buttonIcon} />
        </TouchableOpacity>
      </View>
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
    flex: 1,
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
  },
  button: {
    backgroundColor: '#2f95dc',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonIcon: {
    marginLeft: 4,
  },
});









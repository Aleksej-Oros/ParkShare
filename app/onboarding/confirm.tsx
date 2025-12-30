/**
 * Onboarding Confirm Screen
 * User reviews their profile information and saves to Firestore
 */
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { upsertUser } from '@/services/userService';
import { Text } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';

export default function ConfirmScreen() {
  const params = useLocalSearchParams<{
    username: string;
    brand: string;
    model: string;
    color: string;
  }>();
  const { user } = useAuth();
  const { reloadProfile } = useProfile();
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to complete onboarding');
      // AuthGuard will handle redirect to login
      return;
    }

    setLoading(true);
    try {
      // First, upsert user profile with onboarding data
      // CRITICAL: Ensure all fields are type-safe (strings, not booleans)
      await upsertUser(user.uid, {
        displayName: String(params.username || '').trim(),
        vehicleBrand: String(params.brand || '').trim(),
        vehicleModel: String(params.model || '').trim(),
        vehicleColor: String(params.color || '').trim(),
        // parkPoints, reliabilityScore, badges, etc. will be preserved if user exists
        // or set to defaults if user doesn't exist (handled by upsertUser)
      });

      // Then, explicitly set isOnboarded = true using updateDoc
      // CRITICAL: Ensure isOnboarded is stored as boolean true, not string "true"
      // Use serverTimestamp() for consistency with Firestore (Date.now() would be client time)
      const userRef = doc(firestore, 'users', user.uid);
      await updateDoc(userRef, {
        isOnboarded: true, // Real boolean, not string
        updatedAt: serverTimestamp(),
      });

      // Reload profile data to refresh local state
      await reloadProfile();
    } catch (error: any) {
      console.error('[ConfirmScreen] Error creating user:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to create your profile. Please try again.',
        [
          {
            text: 'Retry',
            onPress: handleComplete,
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="checkmark-circle" size={80} color="#2f95dc" />
          </View>

          <Text style={styles.title}>Review Your Profile</Text>
          <Text style={styles.subtitle}>
            Please review your information before continuing
          </Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="person" size={24} color="#2f95dc" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Username</Text>
                <Text style={styles.infoValue}>{params.username || 'Not set'}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Ionicons name="car" size={24} color="#2f95dc" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Vehicle</Text>
                <Text style={styles.infoValue}>
                  {params.brand || 'N/A'} {params.model || ''} ({params.color || 'N/A'})
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleComplete}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonText}>Complete Setup</Text>
                <Ionicons name="checkmark" size={20} color="#fff" style={styles.buttonIcon} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2f95dc',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  infoCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 16,
  },
  button: {
    height: 50,
    backgroundColor: '#2f95dc',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginLeft: 4,
  },
});


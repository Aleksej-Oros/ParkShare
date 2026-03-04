/**
 * Onboarding Confirm Screen
 * User reviews their profile information and saves to Firestore
 */
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile.realtime';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { upsertUser } from '@/services/userService';
import { Text, useThemeColor } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useLocale } from '@/context/LocaleContext';

export default function ConfirmScreen() {
  const params = useLocalSearchParams<{
    username: string;
    brand: string;
    model: string;
    color: string;
  }>();
  const { user } = useAuth();
  const { t } = useLocale();
  const { profile, isOnboarded } = useProfile(user?.uid ?? null);
  const [loading, setLoading] = useState(false);
  const colorScheme = useColorScheme() ?? 'dark';
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const dividerColor = useThemeColor({}, 'divider');
  const tintColor = Colors[colorScheme].tint;

  // Backup: if profile listener updates before handleComplete's navigate runs, navigate to tutorial when isOnboarded flips
  React.useEffect(() => {
    if (isOnboarded && loading) {
      setLoading(false);
      router.replace('/tutorial-modal');
    }
  }, [isOnboarded, loading]);

  const handleComplete = async () => {
    if (!user) {
      Alert.alert(t('auth.error'), t('onboarding.errorMustBeLoggedIn'));
      return;
    }

    setLoading(true);
    try {
      await upsertUser(user.uid, {
        displayName: String(params.username || '').trim(),
        vehicleBrand: String(params.brand || '').trim(),
        vehicleModel: String(params.model || '').trim(),
        vehicleColor: String(params.color || '').trim(),
      });

      const userRef = doc(firestore, 'users', user.uid);
      await updateDoc(userRef, {
        isOnboarded: true,
        updatedAt: serverTimestamp(),
      });

      // Navigate to tutorial immediately after write (don't wait for profile listener)
      router.replace('/tutorial-modal');

      // Fallback: if navigation didn't happen (e.g. race), try again after 1.5s
      setTimeout(() => {
        setLoading((prev) => (prev ? false : prev));
      }, 1500);
    } catch (error: any) {
      setLoading(false);
      Alert.alert(
        t('auth.error'),
        error.message || t('onboarding.errorCreateProfile'),
        [
          {
            text: t('common.retry'),
            onPress: handleComplete,
          },
          {
            text: t('common.cancel'),
            style: 'cancel',
          },
        ]
      );
    }
    // Don't set loading to false here - let the useEffect handle navigation
    // Loading will be cleared when navigation happens
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="checkmark-circle" size={80} color={tintColor} />
          </View>

          <Text style={[styles.title, { color: tintColor }]}>{t('onboarding.reviewProfile')}</Text>
          <Text style={[styles.subtitle, { color: textSecondaryColor }]}>
            {t('onboarding.reviewInfo')}
          </Text>

          <Card style={{ borderColor: tintColor + '55' }}>
            <View style={styles.infoRow}>
              <Ionicons name="person" size={24} color={tintColor} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: textSecondaryColor }]}>{t('onboarding.usernamePlaceholder')}</Text>
                <Text style={[styles.infoValue, { color: textColor }]}>{params.username || t('onboarding.notSet')}</Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: dividerColor }]} />

            <View style={styles.infoRow}>
              <Ionicons name="car" size={24} color={tintColor} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: textSecondaryColor }]}>{t('profile.vehicle')}</Text>
                <Text style={[styles.infoValue, { color: textColor }]}>
                  {params.brand || 'N/A'} {params.model || ''} ({params.color || 'N/A'})
                </Text>
              </View>
            </View>
          </Card>

          <Button
            title={t('onboarding.completeSetup')}
            onPress={handleComplete}
            variant="primary"
            loading={loading}
            disabled={loading}
            style={styles.button}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
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
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 16,
  },
  button: {
    marginTop: 8,
  },
});


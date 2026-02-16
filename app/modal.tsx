import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, useThemeColor } from '@/components/Themed';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { premiumPriceLabel } from '@/config/premiumConfig';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function PremiumCheckoutScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const tintColor = Colors[colorScheme].tint;

  const handleSubscribe = () => {
    // Placeholder for future IAP integration.
    console.log('[Premium] Subscribe pressed');
    Alert.alert('Coming soon', 'Payments will be available in a future update.');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: textColor }]}>Unlock Premium</Text>
          <Text style={[styles.subtitle, { color: textSecondaryColor }]}>You're one step away</Text>
        </View>

        <Card>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Quick recap</Text>
          <View style={styles.list}>
            <View style={styles.listItemRow}>
              <View style={[styles.listDot, { backgroundColor: tintColor }]} />
              <Text style={[styles.listText, { color: textSecondaryColor }]}>Navigation to parking spots</Text>
            </View>
            <View style={styles.listItemRow}>
              <View style={[styles.listDot, { backgroundColor: tintColor }]} />
              <Text style={[styles.listText, { color: textSecondaryColor }]}>Reserve upcoming free spots</Text>
            </View>
            <View style={styles.listItemRow}>
              <View style={[styles.listDot, { backgroundColor: tintColor }]} />
              <Text style={[styles.listText, { color: textSecondaryColor }]}>Instant pin visibility</Text>
            </View>
            <View style={styles.listItemRow}>
              <View style={[styles.listDot, { backgroundColor: tintColor }]} />
              <Text style={[styles.listText, { color: textSecondaryColor }]}>Advanced search & filters</Text>
            </View>
          </View>
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { color: textColor }]}>What happens after subscribing</Text>
          <View style={styles.list}>
            <View style={styles.listItemRow}>
              <View style={[styles.listDot, { backgroundColor: tintColor }]} />
              <Text style={[styles.listText, { color: textSecondaryColor }]}>Premium features unlock instantly</Text>
            </View>
            <View style={styles.listItemRow}>
              <View style={[styles.listDot, { backgroundColor: tintColor }]} />
              <Text style={[styles.listText, { color: textSecondaryColor }]}>Existing reservations stay active</Text>
            </View>
            <View style={styles.listItemRow}>
              <View style={[styles.listDot, { backgroundColor: tintColor }]} />
              <Text style={[styles.listText, { color: textSecondaryColor }]}>Rewards continue accumulating</Text>
            </View>
            <View style={styles.listItemRow}>
              <View style={[styles.listDot, { backgroundColor: tintColor }]} />
              <Text style={[styles.listText, { color: textSecondaryColor }]}>Cancel anytime from Profile</Text>
            </View>
          </View>
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Price</Text>
          <Text style={[styles.price, { color: textColor }]}>{premiumPriceLabel}</Text>
          <Text style={[styles.helperText, { color: textSecondaryColor }]}>Cancel anytime</Text>
        </Card>

        <View style={styles.ctaSection}>
          <Button
            title="Subscribe & Unlock Premium"
            onPress={handleSubscribe}
            variant="primary"
            style={styles.ctaButton}
          />
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={[styles.secondaryAction, { color: textSecondaryColor }]}>Maybe later</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  list: {
    marginTop: 2,
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  listDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    marginRight: 10,
  },
  listText: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  price: {
    fontSize: 22,
    fontWeight: '700',
  },
  helperText: {
    fontSize: 13,
    marginTop: 6,
  },
  ctaSection: {
    marginTop: 8,
    alignItems: 'center',
    gap: 12,
  },
  ctaButton: {
    width: '100%',
  },
  secondaryAction: {
    fontSize: 14,
  },
});

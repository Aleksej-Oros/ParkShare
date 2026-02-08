import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/Themed';
import { premiumPriceLabel } from '@/config/premiumConfig';

export default function PremiumCheckoutScreen() {
  const handleSubscribe = () => {
    // Placeholder for future IAP integration.
    console.log('[Premium] Subscribe pressed');
    Alert.alert('Coming soon', 'Payments will be available in a future update.');
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Unlock Premium</Text>
          <Text style={styles.subtitle}>You're one step away</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Quick recap</Text>
          <View style={styles.list}>
            <View style={styles.listItemRow}>
              <View style={styles.listDot} />
              <Text style={styles.listText}>Navigation to parking spots</Text>
            </View>
            <View style={styles.listItemRow}>
              <View style={styles.listDot} />
              <Text style={styles.listText}>Reserve upcoming free spots</Text>
            </View>
            <View style={styles.listItemRow}>
              <View style={styles.listDot} />
              <Text style={styles.listText}>Instant pin visibility</Text>
            </View>
            <View style={styles.listItemRow}>
              <View style={styles.listDot} />
              <Text style={styles.listText}>Advanced search & filters</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>What happens after subscribing</Text>
          <View style={styles.list}>
            <View style={styles.listItemRow}>
              <View style={styles.listDot} />
              <Text style={styles.listText}>Premium features unlock instantly</Text>
            </View>
            <View style={styles.listItemRow}>
              <View style={styles.listDot} />
              <Text style={styles.listText}>Existing reservations stay active</Text>
            </View>
            <View style={styles.listItemRow}>
              <View style={styles.listDot} />
              <Text style={styles.listText}>Rewards continue accumulating</Text>
            </View>
            <View style={styles.listItemRow}>
              <View style={styles.listDot} />
              <Text style={styles.listText}>Cancel anytime from Profile</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Price</Text>
          <Text style={styles.price}>{premiumPriceLabel}</Text>
          <Text style={styles.helperText}>Cancel anytime</Text>
        </View>

        <View style={styles.ctaSection}>
          <TouchableOpacity style={styles.ctaButton} onPress={handleSubscribe}>
            <Text style={styles.ctaText}>Subscribe & Unlock Premium</Text>
          </TouchableOpacity>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.secondaryAction}>Maybe later</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    color: '#1d4e89',
  },
  subtitle: {
    fontSize: 14,
    color: '#667085',
    marginTop: 6,
  },
  card: {
    backgroundColor: '#f8f9fb',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e6e8f0',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
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
    backgroundColor: '#2f95dc',
    marginTop: 8,
    marginRight: 10,
  },
  listText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    flex: 1,
  },
  price: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  helperText: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 6,
  },
  ctaSection: {
    marginTop: 8,
    alignItems: 'center',
    gap: 12,
  },
  ctaButton: {
    width: '100%',
    backgroundColor: '#2f95dc',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryAction: {
    fontSize: 14,
    color: '#6b7280',
  },
});

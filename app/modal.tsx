import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, useThemeColor } from '@/components/Themed';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { premiumMonthlyPrice, premiumCurrency } from '@/config/premiumConfig';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useLocale } from '@/context/LocaleContext';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile.realtime';

export default function PremiumCheckoutScreen() {
  const { t } = useLocale();
  const { user: authUser } = useAuth();
  const { profile } = useProfile(authUser?.uid ?? null);
  const colorScheme = useColorScheme() ?? 'dark';
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const tintColor = Colors[colorScheme].tint;
  const discount = profile?.sharingRewardDiscount;
  const hasValidDiscount =
    discount &&
    typeof discount.expiresAt === 'number' &&
    discount.expiresAt > Date.now();

  const handleSubscribe = () => {
    // Placeholder for future IAP integration.
    console.log('[Premium] Subscribe pressed');
    Alert.alert(t('premium.comingSoon'), t('premium.comingSoonMessage'));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: textColor }]}>{t('premium.unlockPremium')}</Text>
          <Text style={[styles.subtitle, { color: textSecondaryColor }]}>{t('premium.oneStepAway')}</Text>
        </View>

        <Card>
          <Text style={[styles.sectionTitle, { color: textColor }]}>{t('premium.quickRecap')}</Text>
          <View style={styles.list}>
            <View style={styles.listItemRow}>
              <View style={[styles.listDot, { backgroundColor: tintColor }]} />
              <Text style={[styles.listText, { color: textSecondaryColor }]}>{t('premium.navToSpots')}</Text>
            </View>
            <View style={styles.listItemRow}>
              <View style={[styles.listDot, { backgroundColor: tintColor }]} />
              <Text style={[styles.listText, { color: textSecondaryColor }]}>{t('premium.reserveUpcoming')}</Text>
            </View>
            <View style={styles.listItemRow}>
              <View style={[styles.listDot, { backgroundColor: tintColor }]} />
              <Text style={[styles.listText, { color: textSecondaryColor }]}>{t('premium.instantPinVisibility')}</Text>
            </View>
            <View style={styles.listItemRow}>
              <View style={[styles.listDot, { backgroundColor: tintColor }]} />
              <Text style={[styles.listText, { color: textSecondaryColor }]}>{t('premium.advancedSearch')}</Text>
            </View>
          </View>
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { color: textColor }]}>{t('premium.afterSubscribing')}</Text>
          <View style={styles.list}>
            <View style={styles.listItemRow}>
              <View style={[styles.listDot, { backgroundColor: tintColor }]} />
              <Text style={[styles.listText, { color: textSecondaryColor }]}>{t('premium.featuresUnlock')}</Text>
            </View>
            <View style={styles.listItemRow}>
              <View style={[styles.listDot, { backgroundColor: tintColor }]} />
              <Text style={[styles.listText, { color: textSecondaryColor }]}>{t('premium.reservationsStayActive')}</Text>
            </View>
            <View style={styles.listItemRow}>
              <View style={[styles.listDot, { backgroundColor: tintColor }]} />
              <Text style={[styles.listText, { color: textSecondaryColor }]}>{t('premium.rewardsContinue')}</Text>
            </View>
            <View style={styles.listItemRow}>
              <View style={[styles.listDot, { backgroundColor: tintColor }]} />
              <Text style={[styles.listText, { color: textSecondaryColor }]}>{t('premium.cancelFromProfile')}</Text>
            </View>
          </View>
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { color: textColor }]}>{t('premium.price')}</Text>
          {hasValidDiscount ? (
            <>
              <Text style={[styles.discountBadge, { color: tintColor }]}>
                {t('premium.youEarnedDiscount', { percent: discount!.percent })}
              </Text>
              <Text style={[styles.rewardCodeLabel, { color: textSecondaryColor }]}>
                {t('premium.useCodeAtCheckout')}
              </Text>
              <Text style={[styles.rewardCode, { color: textColor }]} selectable>
                {discount!.code}
              </Text>
            </>
          ) : (
            <Text style={[styles.price, { color: textColor }]}>
              {premiumMonthlyPrice} {premiumCurrency} / {t('premium.billingPeriodMonth')}
            </Text>
          )}
          <Text style={[styles.helperText, { color: textSecondaryColor }]}>{t('profile.cancelAnytime')}</Text>
        </Card>

        <View style={styles.ctaSection}>
          <Button
            title={t('premium.subscribeUnlock')}
            onPress={handleSubscribe}
            variant="primary"
            style={styles.ctaButton}
          />
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={[styles.secondaryAction, { color: textSecondaryColor }]}>{t('premium.maybeLater')}</Text>
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
  discountBadge: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  rewardCodeLabel: {
    fontSize: 14,
    marginTop: 8,
  },
  rewardCode: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 6,
    letterSpacing: 2,
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

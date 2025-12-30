/**
 * Payment Service
 * Handles RevenueCat integration for subscription payments
 * Manages purchase flows, receipt validation, and subscription status sync
 * 
 * ⚠️ PAYMENT FEATURES DISABLED FOR EXPO GO TESTING ⚠️
 * 
 * This service is structured for future RevenueCat integration but is currently
 * disabled to allow testing in Expo Go. When ready for production:
 * 1. Install: npm install react-native-purchases
 * 2. Configure RevenueCat API keys in environment variables
 * 3. Uncomment and update the implementation below
 * 4. Use EAS Build for production (payments require native code)
 */

import { Platform } from 'react-native';
import { activatePremium, getSubscription, updateSubscription } from '@/services/subscriptionService';

// Payment features are disabled for Expo Go compatibility
const PAYMENTS_ENABLED = false; // Set to true when ready for production with EAS Build

// Type definitions for future RevenueCat integration
export type CustomerInfo = any;
export type PurchasesOffering = any;
export type PurchasesPackage = any;
export type PurchasesStoreProduct = any;

/**
 * Initialize RevenueCat SDK
 * DISABLED: Returns immediately in Expo Go mode
 */
export async function initializeRevenueCat(userId: string): Promise<void> {
  if (!PAYMENTS_ENABLED) {
    console.log('[PaymentService] Payments disabled - skipping RevenueCat initialization');
    return;
  }
  
  // Future implementation when payments are enabled:
  // const Purchases = require('react-native-purchases').default;
  // await Purchases.configure({ apiKey: ... });
  // await Purchases.logIn(userId);
  
  throw new Error('Payments are currently disabled. Enable in paymentService.ts for production.');
}

/**
 * Logout user from RevenueCat
 * DISABLED: Returns immediately in Expo Go mode
 */
export async function logoutRevenueCat(): Promise<void> {
  if (!PAYMENTS_ENABLED) {
    return; // Silently succeed in disabled mode
  }
  // Future implementation
}

/**
 * Get available subscription offerings
 * DISABLED: Returns null in Expo Go mode
 */
export async function getOfferings(): Promise<PurchasesOffering | null> {
  if (!PAYMENTS_ENABLED) {
    return null;
  }
  throw new Error('Payments are currently disabled. Enable in paymentService.ts for production.');
}

/**
 * Get available packages for purchase
 * DISABLED: Returns empty array in Expo Go mode
 */
export async function getAvailablePackages(): Promise<PurchasesPackage[]> {
  if (!PAYMENTS_ENABLED) {
    return [];
  }
  throw new Error('Payments are currently disabled. Enable in paymentService.ts for production.');
}

/**
 * Purchase a subscription package
 * DISABLED: Throws error in Expo Go mode
 */
export async function purchasePackage(
  packageToPurchase: PurchasesPackage,
  userId: string
): Promise<CustomerInfo> {
  if (!PAYMENTS_ENABLED) {
    throw new Error('Payments are currently disabled. Enable in paymentService.ts for production.');
  }
  // Future implementation
  throw new Error('Not implemented');
}

/**
 * Restore purchases
 * DISABLED: Returns mock data in Expo Go mode
 */
export async function restorePurchases(userId: string): Promise<CustomerInfo> {
  if (!PAYMENTS_ENABLED) {
    console.log('[PaymentService] Payments disabled - skipping restore');
    // Return mock customer info for testing
    return {
      entitlements: { active: {} },
    } as CustomerInfo;
  }
  // Future implementation
  throw new Error('Not implemented');
}

/**
 * Check if user has active premium entitlement
 * DISABLED: Returns false in Expo Go mode (use subscriptionService instead)
 */
export async function hasActivePremiumEntitlement(): Promise<boolean> {
  if (!PAYMENTS_ENABLED) {
    return false;
  }
  // Future implementation
  return false;
}

/**
 * Get customer info from RevenueCat
 * DISABLED: Returns null in Expo Go mode
 */
export async function getCustomerInfo(): Promise<CustomerInfo> {
  if (!PAYMENTS_ENABLED) {
    return null as any;
  }
  throw new Error('Payments are currently disabled. Enable in paymentService.ts for production.');
}

/**
 * Get subscription product details
 * DISABLED: Returns null in Expo Go mode
 */
export async function getProductDetails(
  packageIdentifier: string
): Promise<PurchasesStoreProduct | null> {
  if (!PAYMENTS_ENABLED) {
    return null;
  }
  throw new Error('Payments are currently disabled. Enable in paymentService.ts for production.');
}

/**
 * Check if user is eligible for introductory offer
 * DISABLED: Returns false in Expo Go mode
 */
export async function isEligibleForIntroOffer(
  packageIdentifier: string
): Promise<boolean> {
  if (!PAYMENTS_ENABLED) {
    return false;
  }
  return false;
}

/**
 * Handle subscription status changes
 * DISABLED: No-op in Expo Go mode
 */
export async function handleSubscriptionStatusChange(userId: string): Promise<void> {
  if (!PAYMENTS_ENABLED) {
    return; // Silently succeed
  }
  // Future implementation
}

/**
 * Get subscription expiration date
 * DISABLED: Returns null in Expo Go mode
 */
export async function getSubscriptionExpirationDate(): Promise<number | null> {
  if (!PAYMENTS_ENABLED) {
    return null;
  }
  return null;
}

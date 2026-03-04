/**
 * Sharing reward configuration.
 * Users who share this many "Leaving Soon" spots in a month unlock a discount on Premium.
 */

/** Number of Leaving Soon spots to share per month to unlock the reward. */
export const SHARING_REWARD_TARGET = 15;

/** Discount percentage applied to Premium when reward is unlocked (e.g. at checkout). */
export const SHARING_REWARD_DISCOUNT_PERCENT = 30;

/**
 * Promo code users can enter at checkout for the sharing reward.
 * Single code for all eligible users; when IAP is enabled, create this in RevenueCat/Stripe.
 */
export const SHARING_REWARD_CODE = 'SHARE30';

/**
 * Feature Keys Constants
 * 
 * This file centralizes all feature flag keys to prevent typos and ensure consistency
 * across the application. When adding new features, add them here first.
 */

export const FEATURE_KEYS = {
  // Export and Reporting
  ADVANCED_EXPORT: 'ADVANCED_EXPORT',

  // Financial Tools
  FINANCIAL_MANUAL: 'FINANCIAL_MANUAL',

  // Integrations
  QUICKBOOKS_INTEGRATION: 'quickbooks_integration',

  // Add new feature keys here as they're implemented
} as const;

// Type for feature keys
export type FeatureKey = keyof typeof FEATURE_KEYS;

// Helper function to get feature key with validation
export function getFeatureKey(key: FeatureKey): string {
  return FEATURE_KEYS[key];
}

// Validation function to check if a string is a valid feature key
export function isValidFeatureKey(key: string): key is FeatureKey {
  return Object.values(FEATURE_KEYS).includes(key as any);
}
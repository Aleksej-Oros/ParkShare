/**
 * Routing Configuration
 * 
 * IMPORTANT: For Expo Go, environment variables from .env files may not work.
 * You can set your API key directly here as a temporary solution.
 * 
 * For production, use environment variables or app.config.js
 */

// Option 1: Set your API key directly here (works in Expo Go)
// Replace 'your_api_key_here' with your actual OpenRouteService API key
export const OPENROUTESERVICE_API_KEY = 'your_api_key_here';

// Option 2: Try to read from environment variable (works in production builds)
export const getApiKey = (): string | undefined => {
  // First try environment variable
  if (process.env.EXPO_PUBLIC_OPENROUTESERVICE_API_KEY) {
    return process.env.EXPO_PUBLIC_OPENROUTESERVICE_API_KEY;
  }
  
  // Fallback to direct config (for Expo Go)
  if (OPENROUTESERVICE_API_KEY && OPENROUTESERVICE_API_KEY !== 'your_api_key_here') {
    return OPENROUTESERVICE_API_KEY;
  }
  
  return undefined;
};

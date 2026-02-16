// BlaBlaCar-inspired dark mode color palette
const tintColorLight = '#00AFF5'; // BlaBlaCar blue
const tintColorDark = '#00AFF5'; // Same blue for dark mode

export default {
  light: {
    text: '#000',
    textSecondary: '#666',
    background: '#fff',
    cardBackground: '#f8f9fb',
    cardBorder: '#e6e8f0',
    inputBackground: '#f9f9f9',
    inputBorder: '#ddd',
    tint: tintColorLight,
    tabIconDefault: '#999',
    tabIconSelected: tintColorLight,
    error: '#ff4444',
    success: '#4CAF50',
    warning: '#ff9800',
    divider: '#e0e0e0',
  },
  dark: {
    text: '#FFFFFF',
    textSecondary: '#B0B0B0',
    background: '#121212', // Deep dark background
    cardBackground: '#1E1E1E', // Card background
    cardBorder: '#333333', // Card border
    inputBackground: '#252525', // Input background
    inputBorder: '#3A3A3A', // Input border
    tint: tintColorDark,
    tabIconDefault: '#666',
    tabIconSelected: tintColorDark,
    error: '#ff6b6b',
    success: '#51cf66',
    warning: '#ffa94d',
    divider: '#2A2A2A',
  },
};

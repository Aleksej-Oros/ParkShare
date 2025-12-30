import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseConfig } from './firebaseConfig';

// Only initialize if not already initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const firebaseApp = app;

// Initialize Auth with AsyncStorage persistence for React Native
// This ensures auth state persists between app sessions
let auth;
try {
  // Try to get existing auth instance (if already initialized)
  auth = getAuth(app);
} catch (error) {
  // If auth doesn't exist, initialize it with AsyncStorage persistence
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
}

export { auth };
export const firestore = getFirestore(app);






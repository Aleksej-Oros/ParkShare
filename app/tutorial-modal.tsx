/**
 * Expo Router entry for the tutorial modal.
 * Route: /tutorial-modal. Params: forceOpen (string "true" when reopening from Profile).
 */
import { useLocalSearchParams } from 'expo-router';
import TutorialModalScreen from '@/tutorial/TutorialModalScreen';

export default function TutorialModalRoute() {
  const params = useLocalSearchParams<{ forceOpen?: string }>();
  const forceOpen = params.forceOpen === 'true';
  return <TutorialModalScreen forceOpen={forceOpen} />;
}

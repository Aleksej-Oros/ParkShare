/**
 * Onboarding Layout
 * Stack navigator for onboarding flow: Welcome → Username → Vehicle → Confirm
 */
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTintColor: '#2f95dc',
        headerTitleStyle: {
          fontWeight: '600',
        },
        gestureEnabled: false,
        fullScreenGestureEnabled: false,
        gestureResponseDistance: { horizontal: 0, vertical: 0 },
        animationEnabled: true,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Welcome',
          headerShown: false,
          gestureEnabled: false,
          fullScreenGestureEnabled: false,
          gestureResponseDistance: { horizontal: 0, vertical: 0 },
        }}
      />
      <Stack.Screen
        name="username"
        options={{
          title: 'Choose Username',
        }}
      />
      <Stack.Screen
        name="vehicle"
        options={{
          title: 'Vehicle Information',
        }}
      />
      <Stack.Screen
        name="confirm"
        options={{
          title: 'Confirm Profile',
        }}
      />
    </Stack>
  );
}















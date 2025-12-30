/**
 * Onboarding Layout
 * Stack navigator for onboarding flow: Welcome → Username → Vehicle → Confirm
 */
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTintColor: '#2f95dc',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Welcome',
          headerShown: false, // Welcome screen has custom header
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









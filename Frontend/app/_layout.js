import { Slot } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { setupNotificationListeners } from './services/notificationService'; // ✅ Correct path

export default function Layout() {
  useEffect(() => {
    setupNotificationListeners(); // Sets up listener for notification taps
  }, []);

  return (
    <SafeAreaProvider>
      <Slot />
    </SafeAreaProvider>
  );
}
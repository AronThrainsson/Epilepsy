import { Slot } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { setupNotificationListeners } from './services/notificationService'; // ✅ Adjusted path

export default function Layout() {
  useEffect(() => {
    setupNotificationListeners(); // ✅ Listens on tap
  }, []);

  return (
    <SafeAreaProvider>
      <Slot />
    </SafeAreaProvider>
  );
}
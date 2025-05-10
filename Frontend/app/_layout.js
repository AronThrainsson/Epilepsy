import { Slot } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { setupNotificationListeners } from './services/notificationService';
import { useEffect } from 'react';


export default function Layout() {
  useEffect(() => {
    setupNotificationListeners(); //Listen for notifications and direct to GPS screen
  }, []);

  return (
    <SafeAreaProvider>
      <Slot />
    </SafeAreaProvider>
  );
}
// notificationService.js
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { Platform, Alert } from 'react-native';
import { BASE_URL } from '../../config';

export async function registerForPushNotificationsAsync() {
  let token;

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      Alert.alert('Failed to get push token for push notification!');
      return;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    token = tokenData.data;
    console.log('📲 Expo Push Token:', token);
  } else {
    Alert.alert('Must use physical device for Push Notifications');
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  return token;
}

export async function triggerSeizureAlert(epilepsyUserEmail) {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Location permission denied', 'Cannot send seizure location.');
      return;
    }

    const location = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = location.coords;

    const response = await fetch(`${BASE_URL}/api/seizure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        epilepsyUserEmail,
        latitude,
        longitude,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to trigger seizure alert');
    }

    console.log('🚨 Seizure alert sent with location:', latitude, longitude);
  } catch (error) {
    console.error('Error triggering seizure alert:', error);
    Alert.alert('Error', 'Failed to trigger seizure alert');
  }
}
export function setupNotificationListeners() {
  Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    const { latitude, longitude, navigateTo } = data;

    if (navigateTo === 'gps') {
      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);

      if (!isNaN(lat) && !isNaN(lon)) {
        router.replace({
          pathname: '/support/screens/gps',
          params: { latitude: lat, longitude: lon },
        });
      } else {
        router.replace('/support/screens/gps');
      }
    }
  });
}
// notificationService.js
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { Platform, Alert } from 'react-native';
import { BASE_URL } from '../../config';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Create a medication notification channel for Android
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('medications', {
    name: 'Medication Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#9747FF',
    sound: 'default',
    enableVibrate: true,
  });
}

export const registerForPushNotifications = async () => {
  let token;
  
  // Check if the app is running on a physical device and not a simulator
  if (Constants.isDevice) {
    // Request permission for notifications
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for notifications!');
      return null;
    }
    
    // Get the Expo push token
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId, // Add your projectId here if using EAS
    })).data;
  } else {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Additional configuration for Android
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#9747FF',
    });
  }

  return token;
};

export const savePushToken = async (userId, token) => {
  if (!token) return false;
  
  try {
    // Save token to AsyncStorage for local reference
    await AsyncStorage.setItem('pushToken', token);
    
    // Send token to server
    const response = await fetch(`${BASE_URL}/api/profile/updatePushToken`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
        pushToken: token,
      }),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error saving push token:', error);
    return false;
  }
};

// Schedule a notification for medication
export const scheduleMedicationNotification = async (medication) => {
  if (!medication || !medication.enabled) {
    console.log('Medication disabled or invalid, not scheduling notification');
    return null;
  }

  try {
    // First cancel any existing notification for this medication
    if (medication.notificationId) {
      await Notifications.cancelScheduledNotificationAsync(medication.notificationId);
    }

    // Parse the time string (format: "HH:MM")
    const [hours, minutes] = medication.time.split(':').map(Number);
    
    // Create a Date object for today at the specified time
    const notificationTime = new Date();
    notificationTime.setHours(hours, minutes, 0, 0); // Set hours and minutes, zero seconds and milliseconds
    
    // If the time has already passed today, schedule for tomorrow
    const now = new Date();
    if (notificationTime <= now) {
      notificationTime.setDate(notificationTime.getDate() + 1);
    }
    
    console.log(`Scheduling reminder notification for ${medication.name} at ${notificationTime.toLocaleString()}`);

    // Calculate seconds until the notification should trigger
    const secondsUntilNotification = Math.floor((notificationTime.getTime() - now.getTime()) / 1000);
    
    // Schedule the notification as a medication reminder
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Medication Reminder',
        body: `Time to take your ${medication.name} (${medication.dose})`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { medicationId: medication.id },
      },
      trigger: {
        seconds: 2, // Show immediately (2 second delay)
        repeats: false, // Not repeating
      },
    });
    
    console.log(`Medication reminder notification scheduled with ID: ${notificationId}`);
    return notificationId;
  } catch (error) {
    console.error('Error scheduling medication notification:', error);
    return null;
  }
};

// Schedule notifications for all medications - REMOVED RECURRING FUNCTIONALITY
export const scheduleAllMedicationNotifications = async (medications) => {
  // This function now just returns the medications as-is without scheduling recurring notifications
  return medications;
};

// Show a confirmation message when a medication is added
export const showMedicationAddedConfirmation = async (medication) => {
  if (!medication) return medication;
  
  // Log the addition
  console.log(`Medication added: ${medication.name} (${medication.dose}) at ${medication.time}`);
  
  // Schedule a one-time notification
  try {
    // Only show a notification, don't store the ID in the medication object
    await scheduleMedicationNotification(medication);
  } catch (error) {
    console.error('Error showing medication confirmation:', error);
  }
  
  // Return the medication without modification
  return medication;
};

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
    const { latitude, longitude, navigateTo, medicationId } = data;

    if (navigateTo === 'gps') {
      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);

      if (!isNaN(lat) && !isNaN(lon)) {
        router.replace({
          pathname: '/support/gps',
          params: { latitude: lat, longitude: lon },
        });
      } else {
        router.replace('/support/gps');
      }
    } else if (medicationId) {
      // Handle medication notification tap
      router.replace('/epilepsy/medicine');
    }
  });
}
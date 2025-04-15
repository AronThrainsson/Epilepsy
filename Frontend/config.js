import { Platform } from 'react-native';

// i terminal for at finde ip adresse: ipconfig getifaddr en0
const LOCAL_IP = 'http://192.168.1.67:8080'; // Your Mac IP (for real device & simulator)

export const BASE_URL =
  Platform.OS === 'android' && !__DEV__
    ? LOCAL_IP
    : Platform.OS === 'android'
    ? 'http://10.0.2.2:8080'
    : LOCAL_IP;
import { Platform } from 'react-native';

// i terminal for at finde ip adresse: ipconfig getifaddr en0
const LOCAL_IP = 'http://172.20.10.3:8080'; // Your Mac IP (for real device & simulator)

export const BASE_URL =
  Platform.OS === 'android' && !__DEV__
    ? LOCAL_IP
    : Platform.OS === 'android'
    ? 'http://192.168.1.1:8080'
    : LOCAL_IP;
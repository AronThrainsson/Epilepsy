import { Platform } from 'react-native';

// To find your IP address:
// Mac: terminal command 'ipconfig getifaddr en0'
// Windows: command prompt 'ipconfig' and look for IPv4 Address
const LOCAL_IP = 'http://192.168.0.102:8080'; // Update this with your computer's IP address

export const BASE_URL =
  Platform.OS === 'android' && !__DEV__
    ? LOCAL_IP
    : Platform.OS === 'android'
    ? LOCAL_IP  // Using same IP for both dev and prod on Android
    : LOCAL_IP;
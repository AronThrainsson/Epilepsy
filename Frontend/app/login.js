import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  ScrollView,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { BASE_URL } from '../config';
import { registerForPushNotificationsAsync } from './services/notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Please enter email and password');
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Get role from API response or fallback to stored role
        const role = (data.userInfo.role || await AsyncStorage.getItem('userRole') || 'epilepsy').toLowerCase();

        // Store user data
        await AsyncStorage.multiSet([
          ['userId', `${data.userInfo.id}`],
          ['userEmail', data.userInfo.email],
          ['userRole', role],
          ['authToken', data.token || '']
        ]);

        // Remember me functionality
        if (rememberMe) {
          await AsyncStorage.multiSet([
            ['rememberedEmail', email],
            ['rememberedPassword', password]
          ]);
        } else {
          await AsyncStorage.multiRemove(['rememberedEmail', 'rememberedPassword']);
        }

        // Register push notifications
        try {
          const pushToken = await registerForPushNotificationsAsync();
          if (pushToken) {
            await fetch(`${BASE_URL}/api/user/push-token`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${data.token || ''}`
              },
              body: JSON.stringify({ email, pushToken }),
            });
          }
        } catch (pushError) {
          console.warn('Push notification error:', pushError);
        }

        // Navigate based on role - using absolute paths
        if (role === 'epilepsy') {
          router.replace('epilepsy');
        } else if (role === 'support') {
          router.replace('support');
        } else {
          Alert.alert('Unknown Role', 'Please contact support');
          console.warn('Unknown role detected:', role);
        }

      } else {
        Alert.alert('Login Failed', data.message || 'Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', error.message || 'Login failed. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.background}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push('/')}
          >
            <Ionicons name="arrow-back" size={24} color="#4F46E5" />
          </TouchableOpacity>

          <Text style={styles.title}>Login</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            returnKeyType="next"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          {/* Remember Me Checkbox */}
          <View style={styles.rememberMeContainer}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setRememberMe(!rememberMe)}
            >
              {rememberMe ? (
                <Ionicons name="checkbox" size={24} color="#4F46E5" />
              ) : (
                <Ionicons name="square-outline" size={24} color="#4F46E5" />
              )}
            </TouchableOpacity>
            <Text style={styles.rememberMeText}>Remember me</Text>
          </View>

          <TouchableOpacity style={styles.button} onPress={handleLogin}>
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/role')}>
            <Text style={styles.linkText}>Don't have an account? Sign up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#F9F0FF',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {
    paddingHorizontal: 30,
    paddingBottom: 40,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 30,
    zIndex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E3A59',
    marginBottom: 30,
    textAlign: 'center',
    marginTop: Platform.OS === 'ios' ? 60 : 40,
  },
  input: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
    borderColor: '#ddd',
    borderWidth: 1,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    marginRight: 8,
  },
  rememberMeText: {
    color: '#2E3A59',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#CB97F0',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 16,
  },
  linkText: {
    color: '#4F46E5',
    textAlign: 'center',
    marginTop: 10,
  },
});
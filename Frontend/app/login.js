import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Dimensions } from 'react-native';
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
        const role = data.role?.toLowerCase();

        // Store user info locally
        await AsyncStorage.setItem('userEmail', email);
        await AsyncStorage.setItem('userRole', role);

        // Store credentials if remember me is checked
        if (rememberMe) {
          await AsyncStorage.setItem('rememberedEmail', email);
          await AsyncStorage.setItem('rememberedPassword', password);
        } else {
          await AsyncStorage.removeItem('rememberedEmail');
          await AsyncStorage.removeItem('rememberedPassword');
        }

        // Register push token
        const pushToken = await registerForPushNotificationsAsync();

        if (pushToken) {
          await fetch(`${BASE_URL}/api/user/push-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, pushToken }),
          });
        }

        if (role === 'epilepsy') {
          router.replace('/epilepsy/screens');
        } else if (role === 'support') {
          router.replace('/support/support');
        } else {
          Alert.alert('Unknown role:', role);
        }
      } else {
        Alert.alert('Login failed', data.message || 'Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Login error', 'Something went wrong. Please try again.');
    }
  };

  return (
    <View style={styles.background}>
      <View style={styles.container}>
        {/* Back arrow at top left - now goes to index page */}
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
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
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
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/signup')}>
          <Text style={styles.linkText}>Don't have an account? Sign up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    position: 'absolute',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#F9F0FF',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'center',
    marginTop: 90,
  },
  backButton: {
    position: 'absolute',
    top: 10,
    left: 30,
    zIndex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E3A59',
    marginBottom: 30,
    textAlign: 'center',
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
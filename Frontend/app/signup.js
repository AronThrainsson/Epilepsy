import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BASE_URL } from '../config';
import { registerForPushNotificationsAsync } from './services/notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function Signup() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [role, setRole] = useState(params?.role || 'epilepsy');
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const getStoredRole = async () => {
      try {
        const storedRole = await AsyncStorage.getItem('userRole');
        if (storedRole) setRole(storedRole);
      } catch (error) {
        console.error('Error retrieving role:', error);
      }
    };
    getStoredRole();
  }, []);

  const handleSignup = async () => {
    if (!firstName || !surname || !phone || !email || !password || !confirmPassword) {
      Alert.alert('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Passwords do not match');
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          surname,
          phone,
          email,
          password,
          role
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Signup failed');
      }

      // Store user data
      await AsyncStorage.multiSet([
        ['userEmail', email],
        ['userRole', role],
        ['authToken', data.token || '']
      ]);

      // Register for push notifications
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
        console.warn('Push notification registration failed:', pushError);
      }

      // Navigate based on role
      if (role === 'epilepsy') {
        router.replace('epilepsy');
      } else {
        router.replace('support');
      }

      Alert.alert('Success', 'Account created successfully!');

    } catch (error) {
      console.error('Signup error:', error);
      Alert.alert('Signup Error', error.message || 'Could not create account');
    }
  };

  return (
    <View style={styles.background}>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push('/role')}
        >
          <Ionicons name="arrow-back" size={24} color="#4F46E5" />
        </TouchableOpacity>

        <Text style={styles.title}>Create Account</Text>

        <TextInput
          style={styles.input}
          placeholder="First Name"
          value={firstName}
          onChangeText={setFirstName}
        />
        <TextInput
          style={styles.input}
          placeholder="Surname"
          value={surname}
          onChangeText={setSurname}
        />
        <TextInput
          style={styles.input}
          placeholder="Phone"
          value={phone}
          keyboardType="phone-pad"
          onChangeText={setPhone}
        />
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
        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <TouchableOpacity style={styles.button} onPress={handleSignup}>
          <Text style={styles.buttonText}>Sign Up</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/login')}>
          <Text style={styles.linkText}>Already have an account? Log in</Text>
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
    marginTop: 60,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 30,
    zIndex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E3A59',
    marginBottom: 50,
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
  button: {
    backgroundColor: '#CB97F0',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 90,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
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
    fontSize: 14,
    fontWeight: '500',
  },
});
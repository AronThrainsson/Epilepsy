import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { BASE_URL } from '../config';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
  
        if (role === 'epilepsy') {
          router.replace('epilepsy/epilepsy');
        } else if (role === 'support') {
          router.replace('support/support');
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
    <View style={styles.container}>
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

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Sign In</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/signup')}>
        <Text style={styles.linkText}>Don't have an account? Sign up</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F4F7F9',
      paddingHorizontal: 30,
      justifyContent: 'center',
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: '#2E3A59',
      marginBottom: 20,
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
      backgroundColor: '#4F46E5',
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
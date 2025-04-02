import React, { useState } from 'react';
import { BASE_URL } from '../config';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';

export default function Signup() {
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('epilepsy');

  const handleSignup = async () => {
    if (!email || !password || !firstName || !surname || !phone || !confirmPassword) {
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName,
          surname,
          phone,
          email,
          password,
          role,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('✅ Signup successful');
        router.replace('/login');
      } else {
        Alert.alert('❌ Signup failed', data.message || 'Something went wrong');
      }
    } catch (error) {
      console.error('Signup error:', error);
      Alert.alert('❌ Signup failed', 'Unable to reach the server');
    }
  };

  return (
    <View style={styles.container}>
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
        placeholder="Phone Number"
        keyboardType="phone-pad"
        value={phone}
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

      <Text style={styles.label}>Choose role:</Text>
      <View style={styles.roleContainer}>
        <TouchableOpacity
          style={[
            styles.roleButton,
            role === 'epilepsy' && styles.roleButtonSelected,
          ]}
          onPress={() => setRole('epilepsy')}
        >
          <Text style={styles.roleText}>Individual with Epilepsy</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.roleButton,
            role === 'support' && styles.roleButtonSelected,
          ]}
          onPress={() => setRole('support')}
        >
          <Text style={styles.roleText}>Support Member</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.submitButton} onPress={handleSignup}>
        <Text style={styles.submitButtonText}>Sign Up</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/login')}>
        <Text style={styles.linkText}>Already have an account? Log in</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 5,
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  roleButton: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#aaa',
    flex: 1,
    marginHorizontal: 5,
  },
  roleButtonSelected: {
    backgroundColor: 'lightblue',
  },
  roleText: {
    color: 'black',
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: '#10B981',
    padding: 14,
    borderRadius: 10,
    marginTop: 10,
  },
  submitButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  linkText: {
    color: '#4F46E5',
    textAlign: 'center',
    marginTop: 15,
  },
});
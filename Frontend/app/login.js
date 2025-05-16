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
      console.log('Attempting login for:', email);
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log('Login response:', data);

      if (response.ok && data.userInfo && data.userInfo.email) {
        // Get role from API response or fallback to stored role
        const role = (data.userInfo.role || await AsyncStorage.getItem('userRole') || 'epilepsy').toLowerCase();
        console.log('User role:', role);

        // Store user data
        await AsyncStorage.multiSet([
          ['userId', `${data.userInfo.id}`],
          ['userEmail', data.userInfo.email],
          ['userRole', role],
          ['authToken', data.token || '']
        ]);

        // Verify email was stored
        const storedEmail = await AsyncStorage.getItem('userEmail');
        if (!storedEmail) {
          throw new Error('Failed to store user email');
        }
        console.log('Stored user email:', storedEmail);

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

        // For epilepsy users, ensure mate data is properly loaded
        if (role === 'epilepsy') {
          try {
            // Check for any stored mate data for this user
            console.log('Checking for stored mate data for:', storedEmail);
            
            // CRITICAL: Check for logout backups first
            const allStorageKeys = await AsyncStorage.getAllKeys();
            const logoutBackupKeys = allStorageKeys.filter(key => 
              key.startsWith(`logoutBackup_${storedEmail}_`)
            );
            
            if (logoutBackupKeys.length > 0) {
              // Sort by timestamp (most recent first)
              logoutBackupKeys.sort().reverse();
              console.log('Found logout backup keys:', logoutBackupKeys);
              
              // Use the most recent backup
              const mostRecentBackupKey = logoutBackupKeys[0];
              const backupData = await AsyncStorage.getItem(mostRecentBackupKey);
              
              if (backupData) {
                try {
                  const parsedBackup = JSON.parse(backupData);
                  console.log('Loaded logout backup data:', parsedBackup);
                  
                  // Restore all backed up data
                  if (parsedBackup.userEmail === storedEmail) {
                    console.log('Restoring team data from logout backup');
                    
                    const restorePromises = [];
                    
                    if (parsedBackup.activatedMatesData) {
                      restorePromises.push(AsyncStorage.setItem(`activatedMates_${storedEmail}`, parsedBackup.activatedMatesData));
                      restorePromises.push(AsyncStorage.setItem('activatedMates', parsedBackup.activatedMatesData));
                      console.log('Restoring activatedMates data');
                    }
                    
                    if (parsedBackup.formattedMatesData) {
                      restorePromises.push(AsyncStorage.setItem(`formatted_mates_${storedEmail}`, parsedBackup.formattedMatesData));
                      console.log('Restoring formattedMates data');
                    }
                    
                    if (parsedBackup.teamData) {
                      restorePromises.push(AsyncStorage.setItem(`team_${storedEmail}`, parsedBackup.teamData));
                      console.log('Restoring team data');
                    }
                    
                    if (parsedBackup.persistentTeamData) {
                      restorePromises.push(AsyncStorage.setItem(`persistentTeam_${storedEmail}`, parsedBackup.persistentTeamData));
                      restorePromises.push(AsyncStorage.setItem('persistentTeamSelection', parsedBackup.persistentTeamData));
                      console.log('Restoring persistentTeam data');
                    }
                    
                    if (parsedBackup.selectedMatesEmails) {
                      restorePromises.push(AsyncStorage.setItem(`activatedMatesEmails_${storedEmail}`, parsedBackup.selectedMatesEmails));
                      restorePromises.push(AsyncStorage.setItem('activatedMatesEmails', parsedBackup.selectedMatesEmails));
                      console.log('Restoring selectedMatesEmails data');
                    }
                    
                    // Wait for all restore operations to complete
                    await Promise.all(restorePromises);
                    console.log('Successfully restored all team data from logout backup');
                    
                    // Force a flush to ensure everything is written
                    await AsyncStorage.flushGetRequests();
                    
                    // Add a delay to ensure storage operations complete
                    await new Promise(resolve => setTimeout(resolve, 300));
                  }
                } catch (e) {
                  console.warn('Error parsing backup data:', e);
                }
              }
            } else {
              console.log('No logout backups found for this user');
            }
            
            // Check all storage keys that might contain mate data
            const mateRelatedKeys = await AsyncStorage.getAllKeys();
            const mateKeys = mateRelatedKeys.filter(key => 
              (key.includes('mates') || key.includes('team')) && 
              (key.includes(storedEmail) || !key.includes('_'))
            );
            
            console.log('Found mate-related keys:', mateKeys);
            
            // If we have team data, make sure it's properly formatted
            const teamData = await AsyncStorage.getItem(`team_${storedEmail}`);
            const formattedMates = await AsyncStorage.getItem(`formatted_mates_${storedEmail}`);
            const activatedMates = await AsyncStorage.getItem(`activatedMates_${storedEmail}`);
            
            if (teamData) {
              console.log('Found team data for user:', storedEmail);
              
              // If we have team data but not formatted mates, try to create it
              if (!formattedMates && activatedMates) {
                console.log('Creating formatted mates from activatedMates');
                await AsyncStorage.setItem(`formatted_mates_${storedEmail}`, activatedMates);
              }
            }
            
            // Ensure we have the latest support users with availability info
            try {
              const supportResponse = await fetch(`${BASE_URL}/api/support-users?timestamp=${Date.now()}`);
              if (supportResponse.ok) {
                const supportData = await supportResponse.json();
                if (Array.isArray(supportData)) {
                  // Process each support user to ensure availability is a boolean
                  const processedUsers = supportData.map(user => ({
                    ...user,
                    isAvailable: user.isAvailable === true || user.isAvailable === 'true'
                  }));
                  
                  // Store for future use
                  await AsyncStorage.setItem('supportUsers', JSON.stringify(processedUsers));
                  console.log('Updated support users with availability status');
                  
                  // Update availability in storage for each user
                  for (const user of processedUsers) {
                    await AsyncStorage.setItem(`availability_${user.email}`, JSON.stringify(user.isAvailable));
                  }
                }
              }
            } catch (err) {
              console.warn('Error updating support users during login:', err);
            }
            
            // Force a flush to ensure everything is written to storage
            await AsyncStorage.flushGetRequests();
          } catch (mateErr) {
            console.warn('Error processing mate data during login:', mateErr);
            // Continue with login even if there's an error with mate data
          }
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
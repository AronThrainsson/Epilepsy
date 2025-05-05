import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function RoleSelection() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState(null);

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
  };

  const handleContinue = () => {
    if (selectedRole) {
      router.push({ pathname: '/signup', params: { role: selectedRole } });
    }
  };

  return (
    <View style={styles.background}>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push('/')}
        >
          <Ionicons name="arrow-back" size={24} color="#4F46E5" />
        </TouchableOpacity>

        <View style={styles.roleButtonsContainer}>
          <TouchableOpacity
            style={[
              styles.roleButton,
              selectedRole === 'epilepsy' && styles.roleButtonSelected,
            ]}
            onPress={() => handleRoleSelect('epilepsy')}
          >
            <Text style={styles.roleText}>Individual with Epilepsy</Text>
            <Text style={styles.roleDescription}>
              If you experience epileptic seizures - choose patient
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleButton,
              selectedRole === 'support' && styles.roleButtonSelected,
            ]}
            onPress={() => handleRoleSelect('support')}
          >
            <Text style={styles.roleText}>Mate</Text>
            <Text style={styles.roleDescription}>
              If you want to be alerted when your loved one is having a seizure - choose mate
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.continueButton,
            !selectedRole && styles.continueButtonDisabled
          ]}
          onPress={handleContinue}
          disabled={!selectedRole}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
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
    justifyContent: 'space-between',
    paddingBottom: 90,
    marginTop: 90,
  },
  backButton: {
    position: 'absolute',
    top: 10,
    left: 30,
    zIndex: 1,
  },
  roleButtonsContainer: {
    flex: 1,
    marginTop: 300,
  },
  roleButton: {
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 12,
    marginBottom: 20,
  },
  roleButtonSelected: {
    borderWidth: 2,
    borderColor: '#4F46E5',
  },
  roleText: {
    color: '#2E3A59',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
    textAlign: 'center',
  },
  roleDescription: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
  },
  continueButton: {
    backgroundColor: '#CB97F0',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  continueButtonDisabled: {
    backgroundColor: '#E2E8F0',
  },
  continueButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
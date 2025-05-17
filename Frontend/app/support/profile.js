import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from '../../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ProfileInput = ({ label, initialValue, placeholder, editable, onValueChange }) => {
  const [localValue, setLocalValue] = useState(initialValue);

  useEffect(() => {
    setLocalValue(initialValue);
  }, [initialValue]);

  const handleChange = (text) => {
    setLocalValue(text);
    if (onValueChange) {
      onValueChange(text);
    }
  };

  return (
    <View style={styles.inputWrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, !editable && styles.readOnlyInput]}
        value={localValue}
        onChangeText={handleChange}
        editable={editable}
        placeholder={placeholder}
      />
    </View>
  );
};

export default function Profile() {
  const [user, setUser] = useState({
    firstName: '',
    surname: '',
    email: '',
    phone: '',
    infoDuringSeazure: ''
  });

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingSeazureInfo, setIsEditingSeazureInfo] = useState(false);
  const [editingValues, setEditingValues] = useState({
    firstName: '',
    surname: '',
    phone: '',
    infoDuringSeazure: ''
  });

  // Platform-specific header height
  const HEADER_HEIGHT = Platform.OS === 'ios' ? 90 : 60;
  const CONTENT_MARGIN_TOP = HEADER_HEIGHT + 20;

  useEffect(() => {
    AsyncStorage.getItem('userId')
    .then(userId => {
      fetch(`${BASE_URL}/api/profile/get/${userId}`)
        .then(res => res.json())
        .then(data => {
          setUser(data);
          setEditingValues({
            firstName: data.firstName,
            surname: data.surname,
            phone: data.phone,
            infoDuringSeazure: data.infoDuringSeazure
          });
        })
        .catch(err => {
          console.error('Failed to load profile:', err);
          Alert.alert('Error loading profile');
        })
    })
  }, []);

  const handleSave = async () => {
    try {
      const updatedUser = {
        ...user,
        firstName: editingValues.firstName,
        surname: editingValues.surname,
        phone: editingValues.phone,
        infoDuringSeazure: editingValues.infoDuringSeazure
      };

      const response = await fetch(`${BASE_URL}/api/profile/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUser),
      });

      if (response.ok) {
        setUser(updatedUser);
        Alert.alert('Profile updated!');
        setIsEditingProfile(false);
        setIsEditingSeazureInfo(false);
      } else {
        Alert.alert('Failed to update profile');
      }
    } catch (err) {
      console.error('Update error:', err);
      Alert.alert('Error updating profile');
    }
  };

  const handleFieldChange = (field, value) => {
    setEditingValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        backgroundColor="#FFFFFF"
        barStyle="dark-content"
        translucent={Platform.OS === 'android'}
      />

      {/* Header */}
      <View style={[styles.headerContainer, { height: HEADER_HEIGHT }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingContainer}
        keyboardVerticalOffset={Platform.OS === "ios" ? HEADER_HEIGHT : 0}
      >
        <ScrollView
          contentContainerStyle={[styles.container, { marginTop: CONTENT_MARGIN_TOP }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.avatarContainer}>
              <Ionicons name="person-circle-outline" size={100} color="#555" />
              <Text style={styles.greeting}>Hi, {user.firstName || 'profile name'}!</Text>
            </View>

            <ProfileInput
              label="First Name"
              initialValue={user.firstName}
              placeholder="Enter your first name"
              editable={isEditingProfile}
              onValueChange={(value) => handleFieldChange('firstName', value)}
            />
            <ProfileInput
              label="Last Name"
              initialValue={user.surname}
              placeholder="Enter your last name"
              editable={isEditingProfile}
              onValueChange={(value) => handleFieldChange('surname', value)}
            />
            <ProfileInput
              label="Email Address"
              initialValue={user.email}
              placeholder="Your email address"
              editable={false}
            />
            <ProfileInput
              label="Phone Number"
              initialValue={user.phone}
              placeholder="Enter your phone number"
              editable={isEditingProfile}
              onValueChange={(value) => handleFieldChange('phone', value)}
            />

            <View style={styles.editSection}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: isEditingProfile ? '#10B981' : '#CB97F0' }]}
                onPress={isEditingProfile ? handleSave : () => setIsEditingProfile(true)}
              >
                <Text style={styles.buttonText}>{isEditingProfile ? 'Save' : 'Edit Profile'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9F0FF',
  },
  headerContainer: {
    width: '100%',
    position: 'absolute',
    top: 0,
    zIndex: 10,
    backgroundColor: '#F9F0FF',
    paddingTop: Platform.OS === 'ios' ? 30 : 0,

  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: '100%',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2E3A59',
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  content: {
    paddingHorizontal: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 5,
    color: '#555',
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  inputWrapper: {
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fff',
    fontSize: 16,
    color: '#333',
  },
  readOnlyInput: {
    backgroundColor: '#eee',
  },
  editSection: {
    marginVertical: 20,
  },
  button: {
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 2,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 10,
    color: '#333',
  },
});
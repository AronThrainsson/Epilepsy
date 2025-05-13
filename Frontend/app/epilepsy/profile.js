import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from '../../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Profile() {
  const [user, setUser] = useState({
    firstName: '',
    surname: '',
    email: '',
    phone: '',
  });

  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('userId')
    .then(userId => {
      fetch(`${BASE_URL}/api/profile/get/${userId}`)
        .then(res => res.json())
        .then(data => setUser(data))
        .catch(err => {
          console.error('Failed to load profile:', err);
          Alert.alert('Error loading profile');
        })
    })
  }, []);

  const handleSave = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/user/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      });

      if (response.ok) {
        Alert.alert('Profile updated!');
        setIsEditing(false);
      } else {
        Alert.alert('Failed to update profile');
      }
    } catch (err) {
      console.error('Update error:', err);
      Alert.alert('Error updating profile');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.avatarContainer}>
        <Ionicons name="person-circle-outline" size={100} color="#555" />
        <Text style={styles.greeting}>Hi, {user.firstName || 'profile name'}!</Text>
      </View>

      <ProfileInput
        label="Name"
        value={user.firstName}
        editable={isEditing}
        onChangeText={(text) => setUser({ ...user, firstName: text })}
      />
      <ProfileInput
        label="Surname"
        value={user.surname}
        editable={isEditing}
        onChangeText={(text) => setUser({ ...user, surname: text })}
      />
      <ProfileInput
        label="Email"
        value={user.email}
        editable={false}
      />
      <ProfileInput
        label="Phone"
        value={user.phone}
        editable={isEditing}
        onChangeText={(text) => setUser({ ...user, phone: text })}
      />

      <View style={styles.editSection}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: isEditing ? '#10B981' : '#4F46E5' }]}
          onPress={isEditing ? handleSave : () => setIsEditing(true)}
        >
          <Text style={styles.buttonText}>{isEditing ? 'Save' : 'Edit Profile'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>During seizures:</Text>

      <TouchableOpacity style={styles.infoButton}>
        <Text style={styles.infoButtonText}>Add info to my own phone</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.infoButton}>
        <Text style={styles.infoButtonText}>Add info to my mates’ phone</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const ProfileInput = ({ label, value, onChangeText, editable = true }) => (
  <View style={styles.inputWrapper}>
    <TextInput
      style={[styles.input, !editable && styles.readOnlyInput]}
      value={value}
      onChangeText={onChangeText}
      editable={editable}
      placeholder={label}
    />
    <Ionicons name="create-outline" size={20} color="#555" style={styles.editIcon} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fbefff',
    flexGrow: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'left',
    marginBottom: 15,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 5,
  },
  inputWrapper: {
    position: 'relative',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    paddingRight: 40,
    backgroundColor: '#fff',
  },
  readOnlyInput: {
    backgroundColor: '#eee',
  },
  editIcon: {
    position: 'absolute',
    right: 10,
    top: 12,
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
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 10,
  },
  infoButton: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 1,
  },
  infoButtonText: {
    color: '#000',
    textAlign: 'center',
  },
});


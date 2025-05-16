import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Platform,
  Switch,
  StatusBar,
  SafeAreaView,
  Alert
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../config';
import { 
  registerForPushNotifications, 
  savePushToken,
  showMedicationAddedConfirmation,
  scheduleAllMedicationNotifications,
  scheduleMedicationNotification
} from '../services/notificationService';

const MedicationPage = () => {
  const [medicines, setMedicines] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [time, setTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  // Platform-specific header height
  const HEADER_HEIGHT = Platform.OS === 'ios' ? 90 : 60;
  const CONTENT_MARGIN_TOP = HEADER_HEIGHT + 20;

  // Load userId and userEmail on component mount and setup notifications
  useEffect(() => {
    const initialize = async () => {
      try {
        // Get user ID
        const id = await AsyncStorage.getItem('userId');
        // Get user email (important for user-specific medications)
        const email = await AsyncStorage.getItem('userEmail');
        
        if (email) {
          setUserEmail(email);
          console.log('Using email for medications:', email);
        }
        
        if (id) {
          setUserId(id);
          
          // Request notification permissions and setup push token
          const token = await registerForPushNotifications();
          if (token) {
            await savePushToken(id, token);
            console.log('Push token saved:', token);
          }
          
          // Try to load medications from userId-based storage (persists across logins)
          const userIdKey = `medications_userId_${id}`;
          const savedMeds = await AsyncStorage.getItem(userIdKey);
          if (savedMeds) {
            const parsedMeds = JSON.parse(savedMeds);
            console.log(`Loaded ${parsedMeds.length} medications from user ID storage`);
            setMedicines(parsedMeds);
            
            // If we have an email, also save to email-based storage
            if (email) {
              const emailKey = `medications_${email}`;
              await AsyncStorage.setItem(emailKey, JSON.stringify(parsedMeds));
              console.log(`Synced medications to ${emailKey}`);
            }
            
            setIsLoading(false);
            return; // Skip other loading if we already have data
          }
        } else {
          // Generate a local ID if no user ID exists
          const localId = `local_${Date.now()}`;
          await AsyncStorage.setItem('userId', localId);
          setUserId(localId);
          console.log('Created local user ID:', localId);
        }
        
        // Load medications immediately from local storage
        await loadFromLocalStorage(email);
      } catch (error) {
        console.error('Initialization error:', error);
        // Still try to load from local storage
        await loadFromLocalStorage();
      }
    };
    
    initialize();
  }, []);

  // Load medications - try server first, then fall back to local
  useEffect(() => {
    if (userId && userEmail) {
      fetchMedications();
    }
  }, [userId, userEmail]);

  const loadFromLocalStorage = async (email = null) => {
    try {
      const userEmailToUse = email || userEmail;
      if (!userEmailToUse) {
        console.log('No user email available for loading medications');
        setMedicines([]);
        setIsLoading(false);
        return;
      }
      
      // Use user-specific storage key
      const storageKey = `medications_${userEmailToUse}`;
      const savedMeds = await AsyncStorage.getItem(storageKey);
      
      if (savedMeds) {
        const parsedMeds = JSON.parse(savedMeds);
        console.log(`Loaded ${parsedMeds.length} medications for ${userEmailToUse} from local storage`);
        setMedicines(parsedMeds);
        
        // Schedule notifications for loaded medications
        scheduleAllMedicationNotifications(parsedMeds)
          .then(updatedMeds => {
            if (updatedMeds && updatedMeds.length > 0) {
              console.log('Updated medications with notification IDs');
              setMedicines(updatedMeds);
              // Save the updated medications with notification IDs
              AsyncStorage.setItem(storageKey, JSON.stringify(updatedMeds));
            }
          })
          .catch(err => console.error('Error scheduling notifications:', err));
      } else {
        console.log(`No medications found for ${userEmailToUse} in local storage`);
        setMedicines([]);
      }
    } catch (error) {
      console.error('Failed to load from local storage:', error);
      setMedicines([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMedications = async () => {
    try {
      setIsLoading(true);
      
      // Always load from local storage first for immediate display
      await loadFromLocalStorage();
      
      // Then try to get from server
      try {
        console.log(`Fetching medications from server for user ${userId}...`);
        const response = await fetch(`${BASE_URL}/api/medications/user/${userId}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Successfully loaded medications from server:', data.length);
          
          // Add user email to each medication for user-specific storage
          const userMedications = data.map(med => ({
            ...med,
            userEmail: userEmail // Add user email to each medication
          }));
          
          setMedicines(userMedications);
          
          // Save server data to user-specific local storage
          if (userEmail) {
            const storageKey = `medications_${userEmail}`;
            await AsyncStorage.setItem(storageKey, JSON.stringify(userMedications));
            console.log(`Saved medications to ${storageKey}`);
            
            // Schedule notifications for these medications
            scheduleAllMedicationNotifications(userMedications)
              .then(updatedMeds => {
                if (updatedMeds && updatedMeds.length > 0) {
                  console.log('Updated medications with notification IDs');
                  setMedicines(updatedMeds);
                  // Save the updated medications with notification IDs
                  AsyncStorage.setItem(storageKey, JSON.stringify(updatedMeds));
                }
              });
          }
        } else {
          console.log('Server returned error, using local data:', response.status);
          setIsOfflineMode(true);
        }
      } catch (error) {
        console.log('Network error, using local data:', error.message);
        setIsOfflineMode(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedMedicine) {
      setName(selectedMedicine.name);
      setDose(selectedMedicine.dose);
      const [hours, minutes] = selectedMedicine.time.split(':');
      const newTime = new Date();
      newTime.setHours(parseInt(hours));
      newTime.setMinutes(parseInt(minutes));
      setTime(newTime);
    } else {
      setName('');
      setDose('');
      const defaultTime = new Date();
      defaultTime.setHours(8, 0);
      setTime(defaultTime);
    }
  }, [selectedMedicine]);

  const handleSave = async () => {
    // Format time
    const hours = time.getHours().toString().padStart(2, '0');
    const minutes = time.getMinutes().toString().padStart(2, '0');
    const formattedTime = `${hours}:${minutes}`;

    // Create medication object with user email
    const medicationInfo = {
      id: selectedMedicine?.id || `local_${Date.now()}`,
      userId: userId,
      userEmail: userEmail, // Add user email for user-specific storage
      name,
      dose,
      time: formattedTime,
      enabled: selectedMedicine ? selectedMedicine.enabled : true
    };

    console.log('Saving medication:', medicationInfo);

    // Update local state first (optimistic update)
    if (selectedMedicine) {
      setMedicines(prevMedicines => 
        prevMedicines.map(m => (m.id === medicationInfo.id ? medicationInfo : m))
      );
    } else {
      setMedicines(prevMedicines => [...prevMedicines, medicationInfo]);
    }
    
    // IMPROVED APPROACH: Always try to save to the server first
    let savedToServer = false;
    
    try {
      if (userId) {
        console.log('Attempting to save to server first...');
        const response = await fetch(`${BASE_URL}/api/medications/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(medicationInfo),
        });

        if (response.ok) {
          console.log('Successfully saved to server');
          savedToServer = true;
          
          try {
            const savedMedication = await response.json();
            if (savedMedication && savedMedication.id) {
              // Update with server-generated ID
              medicationInfo.id = savedMedication.id;
              
              // Update state with server data
              setMedicines(prevMeds => 
                prevMeds.map(m => m.id === (selectedMedicine?.id || medicationInfo.id) 
                  ? {...savedMedication, userEmail} 
                  : m
                )
              );
            }
          } catch (parseError) {
            console.log('Could not parse server response, but save was successful');
          }
        } else {
          const errorText = await response.text();
          console.error('Server error:', errorText);
        }
      }
    } catch (error) {
      console.error('Error saving to server:', error);
    }
    
    // Always save to user-specific local storage as backup
    try {
      if (!userEmail) {
        console.error('Cannot save medication: No user email available');
        setIsModalVisible(false);
        return;
      }
      
      // Save to multiple storage locations for redundancy
      const storageKey = `medications_${userEmail}`;
      const updatedMedicines = selectedMedicine
        ? medicines.map(m => (m.id === medicationInfo.id ? medicationInfo : m))
        : [...medicines, medicationInfo];
      
      // Save to user-specific key
      await AsyncStorage.setItem(storageKey, JSON.stringify(updatedMedicines));
      console.log(`Medication saved to ${storageKey}`);
      
      // Also save to userId-based key for persistence across logins
      if (userId) {
        const userIdKey = `medications_userId_${userId}`;
        await AsyncStorage.setItem(userIdKey, JSON.stringify(updatedMedicines));
        console.log(`Medication also saved to ${userIdKey} for persistence`);
      }
      
      // Show one-time notification
      showMedicationAddedConfirmation(medicationInfo);
      
    } catch (storageError) {
      console.error('Failed to save to local storage:', storageError);
    }
    
    // Close modal
    setIsModalVisible(false);
  };

  const handleDelete = async () => {
    if (!selectedMedicine) return;
    
    // Delete locally first
    const updatedMedicines = medicines.filter(m => m.id !== selectedMedicine.id);
    setMedicines(updatedMedicines);
    
    try {
      // Cancel any scheduled notification
      if (selectedMedicine.notificationId) {
        try {
          await Notifications.cancelScheduledNotificationAsync(selectedMedicine.notificationId);
          console.log(`Cancelled notification: ${selectedMedicine.notificationId}`);
        } catch (notifError) {
          console.error('Error cancelling notification:', notifError);
        }
      }
      
      // Update user-specific local storage
      if (userEmail) {
        const storageKey = `medications_${userEmail}`;
        await AsyncStorage.setItem(storageKey, JSON.stringify(updatedMedicines));
        console.log(`Medication deleted from ${storageKey}`);
      }
      
      // Try to delete from server if online
      if (!isOfflineMode && userId) {
        try {
          await fetch(`${BASE_URL}/api/medications/delete/${userId}/${selectedMedicine.id}`, {
            method: 'DELETE',
          });
          console.log('Medication deleted from server');
        } catch (error) {
          console.log('Failed to delete from server, but deleted locally');
        }
      }
    } catch (error) {
      console.error('Error during medication deletion:', error);
    }
    
    // Close modal
    setIsModalVisible(false);
  };

  const toggleMedication = async (id) => {
    const medicationToUpdate = medicines.find(med => med.id === id);
    if (!medicationToUpdate) return;

    const updatedMedication = {
      ...medicationToUpdate,
      enabled: !medicationToUpdate.enabled
    };

    // Update locally first
    const updatedMedicines = medicines.map(med => med.id === id ? updatedMedication : med);
    setMedicines(updatedMedicines);
    
    try {
      // Update notification status based on enabled state
      if (updatedMedication.enabled) {
        try {
          // Schedule notification if enabled
          console.log('Scheduling notification for toggled medication');
          const notificationId = await scheduleMedicationNotification(updatedMedication);
          if (notificationId) {
            updatedMedication.notificationId = notificationId;
            console.log('Notification scheduled with ID:', notificationId);
          }
        } catch (notifError) {
          console.error('Error scheduling notification:', notifError);
        }
      } else if (updatedMedication.notificationId) {
        try {
          // Import Notifications directly to avoid the reference error
          const Notifications = require('expo-notifications');
          
          // Cancel notification if disabled
          await Notifications.cancelScheduledNotificationAsync(updatedMedication.notificationId);
          console.log(`Cancelled notification: ${updatedMedication.notificationId}`);
          delete updatedMedication.notificationId;
        } catch (notifError) {
          console.error('Error cancelling notification:', notifError);
        }
      }
      
      // Update user-specific local storage
      if (userEmail) {
        const storageKey = `medications_${userEmail}`;
        const finalUpdatedMedicines = medicines.map(med => med.id === id ? updatedMedication : med);
        await AsyncStorage.setItem(storageKey, JSON.stringify(finalUpdatedMedicines));
        console.log(`Medication toggle saved to ${storageKey}`);
        
        // Also update userId-based storage for persistence
        if (userId) {
          const userIdKey = `medications_userId_${userId}`;
          await AsyncStorage.setItem(userIdKey, JSON.stringify(finalUpdatedMedicines));
          console.log(`Medication toggle also saved to ${userIdKey}`);
        }
      }
      
      // Try to update server if online
      if (!isOfflineMode && userId) {
        try {
          await fetch(`${BASE_URL}/api/medications/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedMedication),
          });
          console.log('Medication toggle saved to server');
        } catch (error) {
          console.log('Failed to update server, but updated locally');
        }
      }
    } catch (error) {
      console.error('Error toggling medication:', error);
    }
  };

  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setTime(selectedTime);
    }
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
          <Text style={styles.title}>My medications</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              setSelectedMedicine(null);
              setIsModalVisible(true);
            }}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content with proper margin to avoid header overlap */}
      <ScrollView
        style={[styles.container, { marginTop: CONTENT_MARGIN_TOP }]}
        contentContainerStyle={styles.scrollContent}
      >
        {isLoading ? (
          <Text style={styles.loadingText}>Loading medications...</Text>
        ) : !userEmail ? (
          <Text style={styles.errorText}>Please log in to manage medications</Text>
        ) : medicines.length === 0 ? (
          <Text style={styles.emptyText}>No medications added yet</Text>
        ) : (
          medicines.map((item) => (
            <View key={item.id} style={[
              styles.medicineItemContainer,
              !item.enabled && styles.disabledMedicine
            ]}>
              <TouchableOpacity
                style={styles.medicineButton}
                onPress={() => {
                  setSelectedMedicine(item);
                  setIsModalVisible(true);
                }}
              >
                <View style={styles.medicineInfo}>
                  <Text style={styles.medicineName}>{item.name}</Text>
                  <Text style={styles.medicineDetails}>{item.dose} • {item.time}</Text>
                </View>
              </TouchableOpacity>
              <Switch
                value={item.enabled}
                onValueChange={() => toggleMedication(item.id)}
                trackColor={{ false: "#767577", true: "#32BF55" }}
                thumbColor={item.enabled ? "#ffffff" : "#f4f3f4"}
                ios_backgroundColor="#3e3e3e"
              />
            </View>
          ))
        )}
        
        {isOfflineMode && (
          <Text style={styles.offlineText}>
            Working in offline mode. Your changes will be saved locally.
          </Text>
        )}
      </ScrollView>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              {selectedMedicine && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleDelete}
                >
                  <Icon name="trash-can" size={24} color="#FF3B30" />
                </TouchableOpacity>
              )}
              <Text style={styles.modalTitle}>
                {selectedMedicine ? 'Edit Medication' : 'Add Medication'}
              </Text>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>Medicine Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="E.g. Epilex"
                autoCapitalize="words"
              />

              <Text style={styles.label}>Dosage</Text>
              <TextInput
                style={styles.input}
                value={dose}
                onChangeText={setDose}
                placeholder="E.g. 200mg"
              />

              <Text style={styles.label}>Time</Text>
              <TouchableOpacity
                style={styles.timeInput}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.timeText}>
                  {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>

              {showTimePicker && (
                <DateTimePicker
                  value={time}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onTimeChange}
                  style={styles.timePicker}
                />
              )}
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={[styles.buttonText, { color: '#000' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
              >
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

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
    paddingTop: Platform.OS === 'ios' ? 30 : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: '100%',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#2E3A59',
  },
  addButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: 'black',
    fontSize: 40,
    textAlign: 'center'
  },
  medicineItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  disabledMedicine: {
    opacity: 0.6
  },
  medicineButton: {
    flex: 1
  },
  medicineInfo: {
    flex: 1
  },
  medicineName: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4
  },
  medicineDetails: {
    color: '#666'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    maxHeight: '80%'
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    justifyContent: 'center',
    position: 'relative'
  },
  deleteButton: {
    position: 'absolute',
    left: 0,
    padding: 10
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  form: {
    marginBottom: 20
  },
  label: {
    marginBottom: 8,
    fontWeight: '600',
    fontSize: 16
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16
  },
  timeText: {
    fontSize: 16
  },
  timePicker: {
    marginBottom: 20
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 10
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelButton: {
    backgroundColor: '#e0e0e0',
    marginRight: 10
  },
  saveButton: {
    backgroundColor: '#CB97F0'
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 30,
    fontSize: 16,
    color: '#666'
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#666'
  },
  errorText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#FF3B30'
  },
  offlineText: {
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
});

export default MedicationPage;
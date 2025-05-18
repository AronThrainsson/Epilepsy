import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  SafeAreaView
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../config';
import { triggerSeizureAlert } from '../services/notificationService';

const LogScreen = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [seizures, setSeizures] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSeizure, setSelectedSeizure] = useState(null);
  const [note, setNote] = useState('');

  const HEADER_HEIGHT = Platform.OS === 'ios' ? 90 : 60;
  const CONTENT_MARGIN_TOP = HEADER_HEIGHT + 20;

  useEffect(() => {
    fetchSeizures();
  }, []);

  const fetchSeizures = async () => {
    try {
      const email = await AsyncStorage.getItem('userEmail');
      if (!email) return;

      const response = await fetch(`${BASE_URL}/api/seizures?epilepsyUserEmail=${email}`);
      if (!response.ok) throw new Error('Failed to fetch seizures');
      const data = await response.json();

      const parsed = data.map(seizure => {
        const timestamp = new Date(seizure.timestamp);
        return {
          ...seizure,
          date: timestamp.toISOString().split('T')[0],
          time: timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          duration: seizure.duration || 1,
          movement: seizure.movement || 'Unknown'
        };
      });

      setSeizures(prev => {
        // Keep any newly added seizures that might not be in the server response yet
        const recentSeizures = prev.filter(s => 
          !parsed.some(p => p.timestamp === s.timestamp) && 
          Date.now() - new Date(s.timestamp).getTime() < 5000
        );
        return [...parsed, ...recentSeizures];
      });
    } catch (err) {
      console.error('Error loading seizures:', err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSeizures();
    setRefreshing(false);
  };

  const handleDayPress = (day) => setSelectedDate(day.dateString);

  const handleSeizurePress = (seizure) => {
    setSelectedSeizure(seizure);
    setNote(seizure.note || '');
    setModalVisible(true);
  };

  const saveNote = async () => {
    if (!selectedSeizure) return;

    try {
      const response = await fetch(`${BASE_URL}/api/seizures/${selectedSeizure.id}/note`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      });

      if (!response.ok) throw new Error('Failed to update note');

      const updated = seizures.map(s =>
        s.id === selectedSeizure.id ? { ...s, note } : s
      );
      setSeizures(updated);
      setSelectedSeizure({ ...selectedSeizure, note });
      setModalVisible(false);
    } catch (err) {
      Alert.alert('Error', 'Could not save note.');
      console.error(err);
    }
  };

  // 👇 Random critical seizure data generator
  const generateCriticalSeizureData = () => {
    const heartRate = Math.floor(Math.random() * 40) + 130; // 130–170
    const spO2 = Math.floor(Math.random() * 5) + 84; // 84–88
    const movement = Math.floor(Math.random() * 10) + 1; // 1–10
    return { heartRate, spO2, movement };
  };

  const logSeizure = async () => {
    try {
      const email = await AsyncStorage.getItem('userEmail');
      if (!email) return Alert.alert('Error', 'User not logged in.');

      const { heartRate, spO2, movement } = generateCriticalSeizureData();
      
      // Create a timestamp for the selected date at the current time
      const now = new Date();
      const selectedDateTime = new Date(selectedDate);
      selectedDateTime.setHours(now.getHours(), now.getMinutes());
      const timestamp = selectedDateTime.toISOString();

      const payload = {
        epilepsyUserEmail: email,
        latitude: 55.4038,
        longitude: 10.4024,
        heartRate,
        spO2,
        movement,
        timestamp
      };

      // Immediately add the new seizure to the state
      const newSeizure = {
        ...payload,
        id: `temp-${Date.now()}`,
        date: selectedDate,
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        duration: 1,
        movement: movement.toString()
      };
      
      setSeizures(prev => [...prev, newSeizure]);

      const response = await fetch(`${BASE_URL}/api/seizure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Failed to log seizure');

      // Trigger notification after successful seizure logging
      await triggerSeizureAlert(email);

      Alert.alert('Success', 'Seizure logged successfully and mates notified.');
      
      // Wait a bit before fetching to ensure server has processed the new seizure
      setTimeout(() => {
        fetchSeizures();
      }, 1000);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to log seizure.');
    }
  };

  const filteredSeizures = seizures.filter(s => s.date === selectedDate);

  const renderSeizureItem = ({ item }) => (
    <TouchableOpacity style={styles.seizureItem} onPress={() => handleSeizurePress(item)}>
      <Text style={styles.seizureTime}>Time: {item.time || 'Unknown time'}</Text>
      <Feather name="chevron-right" size={20} color="#4F46E5" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        backgroundColor="#FFFFFF"
        barStyle="dark-content"
        translucent={Platform.OS === 'android'}
      />

      <View style={[styles.headerContainer, { height: HEADER_HEIGHT }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Seizure Log</Text>
        </View>
      </View>

      <View style={[styles.container, { marginTop: CONTENT_MARGIN_TOP }]}>
        <Calendar
          onDayPress={handleDayPress}
          markedDates={{
            ...seizures.reduce((acc, s) => {
              acc[s.date] = {
                marked: true,
                selected: s.date === selectedDate,
                selectedColor: '#4F46E5',
                dotColor: s.date === selectedDate ? '#FFFFFF' : '#4F46E5'
              };
              return acc;
            }, {}),
            // Add selection for dates without seizures
            ...(seizures.every(s => s.date !== selectedDate) ? {
              [selectedDate]: { selected: true, selectedColor: '#4F46E5' }
            } : {})
          }}
          theme={{
            selectedDayBackgroundColor: '#4F46E5',
            todayTextColor: '#4F46E5',
            arrowColor: '#4F46E5',
          }}
          style={styles.calendar}
        />

        <Text style={styles.sectionTitle}>Seizures on {selectedDate}</Text>
        
        <FlatList
          data={filteredSeizures}
          keyExtractor={(item, i) => `${item.id || item.timestamp}-${i}`}
          renderItem={renderSeizureItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
          ListFooterComponent={
            <TouchableOpacity style={styles.logButton} onPress={logSeizure}>
              <Text style={styles.logButtonText}>+ Log Seizure</Text>
            </TouchableOpacity>
          }
          style={styles.flatListContainer}
          extraData={seizures.length}
        />
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalContainer} 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={-100}
        >
          <View style={styles.modalBackground}>
            <TouchableOpacity style={styles.closeIcon} onPress={() => setModalVisible(false)}>
              <Feather name="x" size={24} color="#4F46E5" />
            </TouchableOpacity>
            <ScrollView 
              style={styles.modalScroll}
              contentContainerStyle={styles.modalContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {selectedSeizure && (
                <>
                  <Text style={styles.modalTitle}>Seizure Details</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Date:</Text>
                    <Text style={styles.detailValue}>{selectedSeizure.date}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Time:</Text>
                    <Text style={styles.detailValue}>{selectedSeizure.time}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Duration:</Text>
                    <Text style={styles.detailValue}>{selectedSeizure.duration} minutes</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Heart Rate:</Text>
                    <Text style={styles.detailValue}>{selectedSeizure.heartRate} bpm</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>SpO2:</Text>
                    <Text style={styles.detailValue}>{selectedSeizure.spO2}%</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Movement:</Text>
                    <Text style={styles.detailValue}>{selectedSeizure.movement}</Text>
                  </View>
                  <Text style={styles.notesLabel}>Notes</Text>
                  <TextInput
                    style={styles.noteInput}
                    value={note}
                    onChangeText={setNote}
                    multiline
                    placeholder="Add your notes here..."
                    placeholderTextColor="#999"
                  />
                  <TouchableOpacity style={styles.saveButton} onPress={saveNote}>
                    <Text style={styles.saveButtonText}>Save Note</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
    backgroundColor: '#F9F0FF',
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
    backgroundColor: '#fff',
    borderRadius: 20,
    marginLeft: 10,
    marginRight: 10,
    marginTop: -25,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2E3A59',
  },
  calendar: {
    marginBottom: 16,
    margin: 16,
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#2E3A59',
  },
  listContent: {
    paddingBottom: 20
  },
  seizureItem: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  seizureTime: {
    fontWeight: 'bold',
    color: '#2E3A59',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  modalBackground: {
    width: '90%',
    maxHeight: '70%',
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  modalScroll: {
    maxHeight: '100%',
    paddingTop: 48,
  },
  modalContent: {
    padding: 24,
    paddingBottom: 32,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#2E3A59',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  detailLabel: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#2E3A59',
    fontWeight: '600',
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E3A59',
    marginTop: 16,
    marginBottom: 8,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
    maxHeight: 120,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
    fontSize: 14,
    color: '#2E3A59',
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: '#CB97F0',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  logButton: {
    backgroundColor: '#CB97F0',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  logButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  closeIcon: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 1,
    padding: 12,
    backgroundColor: 'white',
    borderTopRightRadius: 16,
  },
  flatListContainer: {
    flex: 1,
  },
});

export default LogScreen;
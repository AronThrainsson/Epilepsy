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
  Platform
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../config';

const LogScreen = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [seizures, setSeizures] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSeizure, setSelectedSeizure] = useState(null);
  const [note, setNote] = useState('');

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

      setSeizures(parsed);
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

  const filteredSeizures = seizures.filter(s => s.date === selectedDate);

  const renderSeizureItem = ({ item }) => (
    <TouchableOpacity style={styles.seizureItem} onPress={() => handleSeizurePress(item)}>
      <Text style={styles.seizureTime}>{item.time || 'Unknown time'}</Text>
      <Text style={styles.seizureDuration}>{item.duration} min</Text>
      <Text style={styles.seizureType}>{item.movement}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Seizure Log</Text>

      <Calendar
        onDayPress={handleDayPress}
        markedDates={{
          [selectedDate]: { selected: true, selectedColor: '#4F46E5' },
          ...seizures.reduce((acc, s) => {
            acc[s.date] = { marked: true, dotColor: '#4F46E5' };
            return acc;
          }, {})
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
        keyExtractor={(item, i) => `${item.timestamp}-${i}`}
        renderItem={renderSeizureItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
      />

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <ScrollView contentContainerStyle={styles.modalContent}>
            <TouchableOpacity style={styles.closeIcon} onPress={() => setModalVisible(false)}>
              <Feather name="x" size={24} color="#4F46E5" />
            </TouchableOpacity>
            {selectedSeizure && (
              <>
                <Text style={styles.modalTitle}>Seizure Details</Text>
                <Text>Date: {selectedSeizure.date}</Text>
                <Text>Time: {selectedSeizure.time}</Text>
                <Text>Duration: {selectedSeizure.duration} minutes</Text>
                <Text>Heart Rate: {selectedSeizure.heartRate} bpm</Text>
                <Text>SpO2: {selectedSeizure.spO2}%</Text>
                <Text>Movement: {selectedSeizure.movement}</Text>
                <TextInput
                  style={styles.noteInput}
                  value={note}
                  onChangeText={setNote}
                  multiline
                  placeholder="Add your notes here..."
                />
                <TouchableOpacity style={styles.saveButton} onPress={saveNote}>
                  <Text style={styles.saveButtonText}>Save Note</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  calendar: { marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  listContent: { paddingBottom: 20 },
  seizureItem: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  seizureTime: { flex: 1, fontWeight: 'bold' },
  seizureDuration: { flex: 1, textAlign: 'center' },
  seizureType: { flex: 1, textAlign: 'right', color: '#6B7280' },
  modalContainer: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
    backgroundColor: 'white',
    alignItems: 'stretch',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  closeIcon: { position: 'absolute', top: 16, right: 16 },
  noteInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#4F46E5',
    padding: 12,
    marginTop: 10,
    borderRadius: 8,
  },
  saveButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default LogScreen;
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

const LogScreen = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [seizures, setSeizures] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSeizure, setSelectedSeizure] = useState(null);
  const [note, setNote] = useState('');

  // Platform-specific header height
  const HEADER_HEIGHT = Platform.OS === 'ios' ? 90 : 60;
  const CONTENT_MARGIN_TOP = HEADER_HEIGHT + 20;

  useEffect(() => {
    fetchSeizures();
  }, []);

  const fetchSeizures = async () => {
    try {
      const email = await AsyncStorage.getItem('userEmail');
      const role = await AsyncStorage.getItem('userRole');
      if (!email || !role) return;
  
      const endpoint =
        role === 'support'
          ? `${BASE_URL}/api/seizures?supportUserEmail=${email}`
          : `${BASE_URL}/api/seizures?epilepsyUserEmail=${email}`;
  
      const response = await fetch(endpoint);
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
              if (s.date === selectedDate) {
                acc[s.date] = {
                  selected: true,
                  marked: true,
                  selectedColor: '#4F46E5',
                  dotColor: '#4F46E5'
                };
              } else {
                acc[s.date] = {
                  marked: true,
                  dotColor: '#4F46E5'
                };
              }
              return acc;
            }, {}),
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
          keyExtractor={(item, i) => `${item.timestamp}-${i}`}
          renderItem={renderSeizureItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
          style={styles.flatListContainer}
        />
      </View>

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
          <View style={styles.modalBackground}>
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
    backgroundColor: 'rgba(0,0,0,0.4)'
  },
  modalBackground: {
    flex: 1,
    marginTop: 150,
    justifyContent: 'center'
  },
  modalContent: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
    backgroundColor: 'white',
    alignItems: 'stretch',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#2E3A59',
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
    fontSize: 16,
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#CB97F0',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  closeIcon: {
    alignSelf: 'flex-end',
    padding: 10,
  },
  flatListContainer: {
    flex: 1,
  },
});

export default LogScreen;
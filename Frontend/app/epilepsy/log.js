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
      <View style={styles.seizureItemContent}>
        <Text style={styles.seizureTime}>Time: {item.time || 'Unknown time'}</Text>
        <View style={styles.seizureStats}>
          <Text style={styles.statText}>❤️ {item.heartRate} bpm</Text>
          <Text style={styles.statText}>🫁 {item.spO2}%</Text>
          <Text style={styles.statText}>🏃‍♂️ {item.movement}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

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
          <Text style={styles.title}>Seizure Log</Text>
        </View>
      </View>

      {/* Content with proper margin to avoid header overlap */}
      <ScrollView
        style={[styles.container, { marginTop: CONTENT_MARGIN_TOP }]}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.calendarContainer}>
          <Calendar
            onDayPress={handleDayPress}
            markedDates={{
              ...seizures.reduce((acc, s) => {
                // For dates with seizures
                if (s.date === selectedDate) {
                  // If this date is selected AND has seizures
                  acc[s.date] = { 
                    selected: true, 
                    selectedColor: '#9747FF',
                    marked: true,
                    dotColor: 'white'
                  };
                } else {
                  // If this date has seizures but is not selected
                  acc[s.date] = { 
                    marked: true, 
                    dotColor: '#9747FF' 
                  };
                }
                return acc;
              }, {}),
              // For selected date without seizures (if it's not already in the accumulator)
              ...(seizures.find(s => s.date === selectedDate) ? {} : {
                [selectedDate]: { selected: true, selectedColor: '#9747FF' }
              })
            }}
            theme={{
              selectedDayBackgroundColor: '#9747FF',
              todayTextColor: '#9747FF',
              arrowColor: '#9747FF',
              dotColor: '#9747FF',
              textDayFontWeight: '600',
            }}
            style={styles.calendar}
          />
        </View>

        <View style={styles.seizuresContainer}>
          <Text style={styles.sectionTitle}>Seizures on {selectedDate}</Text>
          <FlatList
            data={filteredSeizures}
            keyExtractor={(item, i) => `${item.timestamp}-${i}`}
            renderItem={renderSeizureItem}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.noSeizuresText}>No seizures recorded for this date</Text>
              </View>
            }
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
              <View style={styles.modalContent}>
                <TouchableOpacity 
                  style={styles.closeIcon} 
                  onPress={() => {
                    setModalVisible(false);
                    setNote('');
                    setSelectedSeizure(null);
                  }}
                >
                  <Feather name="x" size={24} color="#4F46E5" />
                </TouchableOpacity>
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
                      <Text style={styles.detailLabel}>Heart Rate:</Text>
                      <Text style={styles.detailValue}>{selectedSeizure.heartRate} bpm</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Blood Oxygen:</Text>
                      <Text style={styles.detailValue}>{selectedSeizure.spO2}%</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Movement Level:</Text>
                      <Text style={styles.detailValue}>{selectedSeizure.movement}</Text>
                    </View>
                    <View style={styles.notesSection}>
                      <Text style={styles.detailLabel}>Notes:</Text>
                      <TextInput
                        style={styles.noteInput}
                        value={note}
                        onChangeText={setNote}
                        multiline
                        placeholder="Add your notes here..."
                      />
                    </View>
                    <TouchableOpacity style={styles.saveButton} onPress={saveNote}>
                      <Text style={styles.saveButtonText}>Save Note</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </ScrollView>
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
    paddingHorizontal: 2,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2E3A59',
  },
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#2E3A59',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  seizuresContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  listContent: {
    paddingBottom: 20
  },
  seizureItem: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  seizureItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  seizureStats: {
    flexDirection: 'row',
    gap: 10,
  },
  statText: {
    fontSize: 12,
    color: '#4F46E5',
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
    marginTop: 50,
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
  closeIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    padding: 8,
  },
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
    backgroundColor: '#CB97F0',
    padding: 12,
    marginTop: 20,
    borderRadius: 8,
  },
  saveButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
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
    fontSize: 16,
    fontWeight: '500',
    color: '#4B5563',
  },
  detailValue: {
    fontSize: 16,
    color: '#1F2937',
  },
  notesSection: {
    marginTop: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noSeizuresText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4B5563',
  },
  calendar: {
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
});

export default LogScreen;
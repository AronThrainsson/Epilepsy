import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, RefreshControl, TextInput, Alert } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather, MaterialIcons } from '@expo/vector-icons';

export default function LogScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [seizures, setSeizures] = useState([]);
  const [selectedSeizure, setSelectedSeizure] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [currentNote, setCurrentNote] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);

  const loadSeizures = async () => {
    try {
      const storedSeizures = await AsyncStorage.getItem('seizures');
      if (storedSeizures) {
        let parsedSeizures = JSON.parse(storedSeizures);
        parsedSeizures = parsedSeizures.map(seizure => ({
          ...seizure,
          id: seizure.id || Date.now().toString() + Math.random().toString(36).substr(2, 9)
        }));
        setSeizures(parsedSeizures);
      } else {
        setSeizures([]);
      }
    } catch (error) {
      console.error('Error loading seizures:', error);
    }
  };

  useEffect(() => {
    loadSeizures();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSeizures();
    setRefreshing(false);
  };

  const filteredSeizures = seizures.filter(seizure => seizure.date === selectedDate);

  const handleDayPress = (day) => {
    setSelectedDate(day.dateString);
  };

  const handleSeizurePress = (seizure) => {
    setSelectedSeizure(seizure);
    setModalVisible(true);
  };

  const handleEditNote = () => {
    setCurrentNote(selectedSeizure.note || '');
    setIsEditingNote(true);
  };

  const saveNote = async () => {
    try {
      const updatedSeizures = seizures.map(seizure =>
        seizure.id === selectedSeizure.id ? { ...seizure, note: currentNote } : seizure
      );

      await AsyncStorage.setItem('seizures', JSON.stringify(updatedSeizures));
      setSeizures(updatedSeizures);
      setSelectedSeizure({...selectedSeizure, note: currentNote});
      setIsEditingNote(false);
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };

  const deleteSeizure = async (seizureId) => {
    try {
      Alert.alert(
        "Delete Seizure",
        "Are you sure you want to delete this seizure record?",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Delete",
            onPress: async () => {
              const updatedSeizures = seizures.filter(seizure => seizure.id !== seizureId);
              await AsyncStorage.setItem('seizures', JSON.stringify(updatedSeizures));
              setSeizures(updatedSeizures);
              setModalVisible(false);
            },
            style: "destructive"
          }
        ]
      );
    } catch (error) {
      console.error('Error deleting seizure:', error);
    }
  };

  const addSampleData = async () => {
    try {
      const currentSeizures = seizures || [];
      const sampleSeizures = [
        {
          id: Date.now().toString(),
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          duration: Math.floor(Math.random() * 5) + 1,
          heartRate: Math.floor(Math.random() * 40) + 80,
          spO2: Math.floor(Math.random() * 10) + 90,
          movement: ['Tonic-clonic', 'Myoclonic', 'Atonic', 'Absence'][Math.floor(Math.random() * 4)],
          note: 'Sample note for seizure 1'
        },
        {
          id: (Date.now() + 1).toString(),
          date: new Date().toISOString().split('T')[0],
          time: new Date(Date.now() - 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          duration: Math.floor(Math.random() * 5) + 1,
          heartRate: Math.floor(Math.random() * 40) + 80,
          spO2: Math.floor(Math.random() * 10) + 90,
          movement: ['Tonic-clonic', 'Myoclonic', 'Atonic', 'Absence'][Math.floor(Math.random() * 4)],
          note: 'Sample note for seizure 2'
        }
      ];

      const updatedSeizures = [...currentSeizures, ...sampleSeizures];
      await AsyncStorage.setItem('seizures', JSON.stringify(updatedSeizures));
      setSeizures(updatedSeizures);
    } catch (error) {
      console.error('Error adding sample data:', error);
    }
  };

  const renderSeizureItem = ({ item }) => (
    <TouchableOpacity
      style={styles.seizureItem}
      onPress={() => handleSeizurePress(item)}
    >
      <Text style={styles.seizureTime}>{item.time || 'Unknown time'}</Text>
      <Text style={styles.seizureDuration}>{item.duration} minutes</Text>
      <Text style={styles.seizureType}>{item.movement || 'Unknown type'}</Text>
      {item.note && <Feather name="file-text" size={16} color="#4F46E5" style={styles.noteIndicator} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Seizure Log</Text>

      <View style={styles.calendarContainer}>
        <Calendar
          onDayPress={handleDayPress}
          markedDates={{
            [selectedDate]: { selected: true, selectedColor: '#4F46E5' },
            ...seizures.reduce((acc, seizure) => {
              acc[seizure.date] = { marked: true, dotColor: '#4F46E5' };
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
      </View>

      <View style={styles.seizuresContainer}>
        <Text style={styles.sectionTitle}>Seizures on {selectedDate}</Text>

        {filteredSeizures.length > 0 ? (
          <FlatList
            data={filteredSeizures}
            renderItem={renderSeizureItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            initialNumToRender={2}
            windowSize={5}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
              />
            }
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.noSeizuresText}>No seizures recorded for this date</Text>
          </View>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.smallButton, styles.sampleButton]}
            onPress={addSampleData}
          >
            <Text style={styles.buttonText}>Add Sample</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.smallButton, styles.addButton]}
            onPress={() => router.push('/add-seizure')}
          >
            <Text style={styles.buttonText}>Add Seizure</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Seizure Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seizure Details</Text>

            {selectedSeizure && (
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date:</Text>
                  <Text style={styles.detailValue}>{selectedSeizure.date}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Time:</Text>
                  <Text style={styles.detailValue}>{selectedSeizure.time || '--'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Duration:</Text>
                  <Text style={styles.detailValue}>{selectedSeizure.duration} minutes</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Heart Rate:</Text>
                  <Text style={styles.detailValue}>{selectedSeizure.heartRate || '--'} bpm</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>SpO2:</Text>
                  <Text style={styles.detailValue}>{selectedSeizure.spO2 || '--'}%</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Movement:</Text>
                  <Text style={styles.detailValue}>{selectedSeizure.movement || '--'}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Notes:</Text>
                  <TouchableOpacity onPress={handleEditNote}>
                    <Feather name="edit" size={20} color="#4F46E5" />
                  </TouchableOpacity>
                </View>

                {isEditingNote ? (
                  <View style={styles.noteInputContainer}>
                    <TextInput
                      style={styles.noteInput}
                      multiline
                      numberOfLines={4}
                      placeholder="Enter notes about this seizure..."
                      value={currentNote}
                      onChangeText={setCurrentNote}
                      autoFocus
                    />
                    <View style={styles.noteButtonRow}>
                      <TouchableOpacity
                        style={[styles.noteButton, styles.cancelButton]}
                        onPress={() => setIsEditingNote(false)}
                      >
                        <Text style={styles.buttonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.noteButton, styles.saveButton]}
                        onPress={saveNote}
                      >
                        <Text style={styles.buttonText}>Save</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : selectedSeizure.note ? (
                  <View style={styles.noteContainer}>
                    <Text style={styles.noteText}>{selectedSeizure.note}</Text>
                  </View>
                ) : (
                  <Text style={styles.noNotesText}>No notes added</Text>
                )}
              </>
            )}

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={() => deleteSeizure(selectedSeizure?.id)}
              >
                <MaterialIcons name="delete" size={20} color="white" />
                <Text style={styles.buttonText}> Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.closeButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7F9',
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#2E3A59',
    marginVertical: 12,
    textAlign: 'center',
  },
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    height: 320,
  },
  calendar: {
    height: 300,
  },
  seizuresContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    minHeight: 300,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E3A59',
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 16,
  },
  seizureItem: {
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seizureTime: {
    fontWeight: '500',
    color: '#2E3A59',
    flex: 1,
  },
  seizureDuration: {
    color: '#4F46E5',
    fontWeight: '500',
    flex: 1,
    textAlign: 'center',
  },
  seizureType: {
    color: '#64748B',
    flex: 1,
    textAlign: 'right',
  },
  noteIndicator: {
    marginLeft: 8,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noSeizuresText: {
    textAlign: 'center',
    color: '#64748B',
    fontSize: 16,
  },
  noNotesText: {
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  smallButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    width: '48%',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#4F46E5',
  },
  sampleButton: {
    backgroundColor: '#64748B',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E3A59',
    marginBottom: 20,
    textAlign: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailLabel: {
    fontWeight: '600',
    color: '#2E3A59',
  },
  detailValue: {
    color: '#475569',
  },
  noteContainer: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  noteText: {
    color: '#475569',
  },
  noteInputContainer: {
    marginTop: 8,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  noteButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  noteButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 8,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  closeButton: {
    backgroundColor: '#4F46E5',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  cancelButton: {
    backgroundColor: '#64748B',
  },
  saveButton: {
    backgroundColor: '#10B981',
  },
});
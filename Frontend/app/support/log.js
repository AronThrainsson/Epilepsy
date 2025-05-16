import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  RefreshControl,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { BASE_URL } from '../../config';

const LogScreen = () => {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [seizures, setSeizures] = useState([]);
  const [selectedSeizure, setSelectedSeizure] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentNote, setCurrentNote] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [epilepsyUser, setEpilepsyUser] = useState(null);

  // Platform-specific header height
  const HEADER_HEIGHT = Platform.OS === 'ios' ? 90 : 60;
  const CONTENT_MARGIN_TOP = HEADER_HEIGHT + 20;

  const loadSeizures = async () => {
    try {
      const storedSeizures = await AsyncStorage.getItem('seizures');
      if (storedSeizures) {
        let parsedSeizures = JSON.parse(storedSeizures);
        parsedSeizures = parsedSeizures.map(seizure => ({
          ...seizure,
          id: seizure.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
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
    fetchTeamAndSeizures();
  }, []);

  const fetchTeamAndSeizures = async () => {
    try {
      setRefreshing(true);
      const email = await AsyncStorage.getItem('userEmail');
      if (!email) {
        setRefreshing(false);
        return;
      }

      // First get the team info to find which epilepsy user this support user is assigned to
      const teamResponse = await fetch(`${BASE_URL}/api/user/${encodeURIComponent(email)}/team?timestamp=${Date.now()}`);
      
      if (!teamResponse.ok) {
        console.warn('Could not load team data');
        setRefreshing(false);
        return;
      }

      const teamData = await teamResponse.json();
      console.log('Team data from API:', teamData);
      
      if (teamData && teamData.epilepsyUser) {
        setEpilepsyUser(teamData.epilepsyUser);
        // Now fetch seizures for this epilepsy user
        await fetchSeizures(teamData.epilepsyUser.email);
      } else {
        console.warn('No epilepsy user assigned to this support user');
      }
      
      setRefreshing(false);
    } catch (err) {
      console.error('Error loading team and seizures:', err);
      setRefreshing(false);
    }
  };

  const fetchSeizures = async (epilepsyUserEmail) => {
    if (!epilepsyUserEmail) return;
    
    try {
      const response = await fetch(`${BASE_URL}/api/seizures?epilepsyUserEmail=${epilepsyUserEmail}`);
      if (!response.ok) {
        console.warn('Failed to fetch seizures');
        return;
      }
      
      const data = await response.json();
      console.log(`Loaded ${data.length} seizures for ${epilepsyUserEmail}`);

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
      Alert.alert('Error', 'Failed to load seizures. Please try again later.');
    }
  };

  const onRefresh = async () => {
    await fetchTeamAndSeizures();
  };

  const handleDayPress = (day) => {
    setSelectedDate(day.dateString);
  };

  const handleSeizurePress = (seizure) => {
    setSelectedSeizure(seizure);
    setCurrentNote(seizure.note || '');
    setIsEditingNote(true);
    setModalVisible(true);
  };

  const handleEditNote = () => {
    setCurrentNote(selectedSeizure?.note || '');
    setIsEditingNote(true);
  };

  const saveNote = async () => {
    if (!selectedSeizure) return;

    try {
      const response = await fetch(`${BASE_URL}/api/seizures/${selectedSeizure.id}/note`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ note: currentNote }),
      });

      if (!response.ok) throw new Error('Failed to update note');

      // Update local state
      setSeizures(seizures.map(s => 
        s.id === selectedSeizure.id ? { ...s, note: currentNote } : s
      ));
      setModalVisible(false);
    } catch (error) {
      console.error('Error saving note:', error);
      Alert.alert('Error', 'Failed to save note. Please try again later.');
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
          id: `${Date.now()}-1`,
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          duration: Math.floor(Math.random() * 5) + 1,
          heartRate: Math.floor(Math.random() * 40) + 80,
          spO2: Math.floor(Math.random() * 10) + 90,
          movement: ['Tonic-clonic', 'Myoclonic', 'Atonic', 'Absence'][Math.floor(Math.random() * 4)],
          note: 'Sample note for seizure 1'
        },
        {
          id: `${Date.now()}-2`,
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

  const filteredSeizures = seizures.filter(seizure => seizure.date === selectedDate);

  const renderSeizureItem = ({ item }) => (
    <TouchableOpacity
      style={styles.seizureItem}
      onPress={() => handleSeizurePress(item)}
    >
      <View style={styles.seizureItemContent}>
        <Text style={styles.seizureTime}>Time: {item.time || 'Unknown time'}</Text>
        <View style={styles.seizureStats}>
          <Text style={styles.statText}>❤️ {item.heartRate || '--'} bpm</Text>
          <Text style={styles.statText}>🫁 {item.spO2 || '--'}%</Text>
          <Text style={styles.statText}>🏃‍♂️ {item.movement || 'Unknown'}</Text>
        </View>
      </View>
      {item.note && <Feather name="file-text" size={16} color="#4F46E5" style={styles.noteIndicator} />}
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
          <Text style={styles.headerTitle}>Seizure Log</Text>
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
          {epilepsyUser && (
            <View style={styles.patientInfoContainer}>
              <Text style={styles.patientName}>
                {epilepsyUser.firstName} {epilepsyUser.surname || ''}'s Seizure Log
              </Text>
            </View>
          )}

          <View style={styles.calendarContainer}>
            <Calendar
              onDayPress={handleDayPress}
              markedDates={{
                ...seizures.reduce((acc, seizure) => {
                  // For dates with seizures
                  if (seizure.date === selectedDate) {
                    // If this date is selected AND has seizures
                    acc[seizure.date] = { 
                      selected: true, 
                      selectedColor: '#9747FF',
                      marked: true,
                      dotColor: 'white'
                    };
                  } else {
                    // If this date has seizures but is not selected
                    acc[seizure.date] = { 
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

            {filteredSeizures.length > 0 ? (
              <FlatList
                data={filteredSeizures}
                renderItem={renderSeizureItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
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
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal for seizure details */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalContent}>
              {/* Added delete icon in top left */}
              <TouchableOpacity
                style={styles.deleteIcon}
                onPress={() => selectedSeizure && deleteSeizure(selectedSeizure.id)}
              >
                <MaterialIcons name="delete" size={24} color="#EF4444" />
              </TouchableOpacity>

              {/* Existing close icon in top right */}
              <TouchableOpacity
                style={styles.closeIcon}
                onPress={() => setModalVisible(false)}
              >
                <Feather name="x" size={24} color="#4F46E5" />
              </TouchableOpacity>

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
                        placeholder="Enter notes about this seizure..."
                        value={currentNote}
                        onChangeText={setCurrentNote}
                        autoFocus
                      />
                      <View style={styles.actionButtonsContainer}>
                        <View style={styles.noteActionButtons}>
                          <TouchableOpacity
                            style={[styles.noteButton, styles.cancelButton]}
                            onPress={() => setIsEditingNote(false)}
                          >
                            <Text style={styles.buttonTextCancel}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.noteButton, styles.saveButton]}
                            onPress={saveNote}
                          >
                            <Text style={styles.buttonTextSave}>Save</Text>
                          </TouchableOpacity>
                        </View>
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
            </View>
          </ScrollView>
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
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  calendar: {
    height: 300,
    borderRadius: 10,
  },
  seizuresContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    color: '#2E3A59',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  listContent: {
    paddingBottom: 16,
  },
  seizureItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  seizureItemContent: {
    flex: 1,
  },
  seizureTime: {
    fontWeight: '500',
    color: '#2E3A59',
    fontSize: 15,
    marginBottom: 4,
  },
  seizureStats: {
    flexDirection: 'row',
    marginTop: 4,
  },
  statText: {
    color: '#4F46E5',
    fontWeight: '500',
    marginRight: 12,
    fontSize: 14,
  },
  noteIndicator: {
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noSeizuresText: {
    color: '#64748B',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    marginHorizontal: 20,
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
  noNotesText: {
    color: '#64748B',
    fontStyle: 'italic',
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
    backgroundColor: 'white',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  noteActionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flex: 1,
  },
  actionButton: {
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    width: 40,
    height: 40,
  },
  deleteButtonBottom: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  noteButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  closeIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    padding: 4,
  },
  buttonTextCancel: {
    color: '#000',
    fontWeight: '600'
  },
  buttonTextSave: {
    color: '#fff',
    fontWeight: '600'
  },
  cancelButton: {
    backgroundColor: '#e0e0e0',
  },
  saveButton: {
    backgroundColor: '#CB97F0',
  },
  patientInfoContainer: {
    backgroundColor: '#F9F0FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CB97F0',
  },
  patientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E3A59',
  },
});

export default LogScreen;
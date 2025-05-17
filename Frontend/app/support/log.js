//react native import block, import of react and hooks (useState & useEffect)
//useState = lets component store and update values (e.g. variables)
//useEffect = runs code when component loads and when certain values change 
import React, { useState, useEffect } from 'react';
import { //imports UI components from react-native to build screens, layouts, input, modals, alert etc.
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
//Import UI calendar component (to display and choose dates)
import { Calendar } from 'react-native-calendars';
//Import icons via Expo
import { useRouter } from 'expo-router';
//Async lets the app save data locally on the device (like a small-database for user settings or saved data)
import AsyncStorage from '@react-native-async-storage/async-storage';
//imports the base URL for backend API calls 
import { Feather, MaterialIcons } from '@expo/vector-icons';

//Define of functional React component LogScreen, for displaying and managing seizure logs
const LogScreen = () => { 
  //useState calls to store data and track UI behaviour / keep track of selected data (YYYY/MM/DD)
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [seizures, setSeizures] = useState([]); //array of seizure records fetched from backend
  const [selectedSeizure, setSelectedSeizure] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentNote, setCurrentNote] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);

  // Adjust layout depending on whether it is running on iOs or Andriod / add extra spacing for content positioning
  const HEADER_HEIGHT = Platform.OS === 'ios' ? 90 : 60;
  const CONTENT_MARGIN_TOP = HEADER_HEIGHT + 20;

  //load seizure from local stoage (asyncStorage)
  const loadSeizures = async () => {
    try {
      const storedSeizures = await AsyncStorage.getItem('seizures'); //AsyncStorage.getItem = loads previously saved data locally (not from server)
      if (storedSeizures) {
        let parsedSeizures = JSON.parse(storedSeizures);
        parsedSeizures = parsedSeizures.map(seizure => ({
          ...seizure,
          id: seizure.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` //generate unique ID for seizures missing one
        }));
        setSeizures(parsedSeizures); //uodate state with the loaded seizure data
      } else {
        setSeizures([]);
      }
    } catch (error) {
      console.error('Error loading seizures:', error);
    }
  };

  //load seizures once when the component mounts, mounts = component gets successfully inserted into the DOM
  useEffect(() => {
    loadSeizures();
  }, []);

  //pull-to-refresh function / refresh seizure list when user pulls to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await loadSeizures();
    setRefreshing(false);
  };

  //filter seizures to only show for the current selected date
  const filteredSeizures = seizures.filter(seizure => seizure.date === selectedDate);

  //called when user taps a date on the calendar
  //updates selctedDate when tapped on the calendar
  const handleDayPress = (day) => {
    setSelectedDate(day.dateString);
  };

  //open modal and load selected seizure details when tapped / when user taps a seizure entry
  const handleSeizurePress = (seizure) => {
    setSelectedSeizure(seizure);
    setModalVisible(true);
  };

  //prepare to edit the note for selected seizure
  const handleEditNote = () => {
    setCurrentNote(selectedSeizure?.note || '');
    setIsEditingNote(true);
  };

  //save the updated note locally
  const saveNote = async () => {
    if (!selectedSeizure) return;

    try {
      const updatedSeizures = seizures.map(seizure => //loops throug hall seizures to find selected one by ID
      // updates nate with new currentNote value
        seizure.id === selectedSeizure.id ? { ...seizure, note: currentNote } : seizure
      );

      //update state and close edit mode
      await AsyncStorage.setItem('seizures', JSON.stringify(updatedSeizures)); //saves the new seizure list to local storage
      setSeizures(updatedSeizures);
      setSelectedSeizure({...selectedSeizure, note: currentNote});
      setIsEditingNote(false);
    } catch (error) {
      console.error('Error saving note:', error); //catch and log errors
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
    padding: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    padding: 15,
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noSeizuresText: {
    color: '#64748B',
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  smallButton: {
    paddingVertical: 12,
    borderRadius: 8,
    width: '48%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addButton: {
    backgroundColor: '#CB97F0',
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
});

export default LogScreen;
//imports React and hooks (useState and useEffect) for state and lifecycle
//useState = let component store and update values (e.g. variables)
//useEffect = run code when the component loads or when values change
import React, { useState, useEffect } from 'react';
import { //imports UI components for react-native 
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
//import calendar UI components for date selection
import { Calendar } from 'react-native-calendars';
//import icon for UI visual via expo
import { Feather } from '@expo/vector-icons';
//import AsyncStorage to save and retrieve data local on device
import AsyncStorage from '@react-native-async-storage/async-storage';
//import base URL for API calls
import { BASE_URL } from '../../config';
//import function triggerSeizure Alert from module notificationService.js
import { triggerSeizureAlert } from '../services/notificationService';

//functional React component LogScreen, for displaying and managing seizure logs
const LogScreen = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); //keep track and store the current selected data as a string YYYY-MM-DD format
  const [seizures, setSeizures] = useState([]); //holds an array of seizure records fetched from the backend
  const [refreshing, setRefreshing] = useState(false); //pull-to-refresh, state to indicate if the list is refreshing
  const [modalVisible, setModalVisible] = useState(false); //track if modal pop-up is open/visible or closed
  const [selectedSeizure, setSelectedSeizure] = useState(null); //store the selected seizure for viewing/editing
  const [note, setNote] = useState(''); //store user-entered note related to seizure

  //adjust header height/layout based on platform (iOS & Android)
  //add spacing for content positioning 
  const HEADER_HEIGHT = Platform.OS === 'ios' ? 90 : 60; 
  const CONTENT_MARGIN_TOP = HEADER_HEIGHT + 20;

  //useEffect = runs once to load seizure when component mounts 
  //mount = making files and directories from one file system available to use within another file system
  useEffect(() => {
    fetchSeizures(); //function to load data from backend
  }, []);

  //async function to get seizure data from backend
  const fetchSeizures = async () => {
    try {
      const email = await AsyncStorage.getItem('userEmail'); //retrieves user email form local storage to load seizure, exit if not found
      if (!email) return;

      const response = await fetch(`${BASE_URL}/api/seizures?epilepsyUserEmail=${email}`); //call API to fetch seizure
      if (!response.ok) throw new Error('Failed to fetch seizures'); //if server response is not ok, return error
      const data = await response.json(); //convert response data into JSON format
      // JSON = standard text-based format for representing structured data based on JavaScript object syntax 

      //format and clean up seizure data: convert timestamp & set defaults values if values are missing
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

      //Update seizure state with newly fetched data, but keep local entries from the last 5 sec (not yet synced)
      setSeizures(prev => {
        const recentSeizures = prev.filter(s => 
          !parsed.some(p => p.timestamp === s.timestamp) && 
          Date.now() - new Date(s.timestamp).getTime() < 5000
        );
        return [...parsed, ...recentSeizures];
      });
    } catch (err) { 
      //catch and log errors during the fetch process
      console.error('Error loading seizures:', err);
    }
  };

  //refresh the seizure list when user pulls to refresh 
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSeizures();
    setRefreshing(false);
  };

  //update selected date when user taps a date on the calendar
  const handleDayPress = (day) => setSelectedDate(day.dateString);

  //open modal and load selected seizure details when tapped
  const handleSeizurePress = (seizure) => {
    setSelectedSeizure(seizure);
    setNote(seizure.note || '');
    setModalVisible(true);
  };

  //async functionto save a note related to a selected seizure
  const saveNote = async () => {
    if (!selectedSeizure) return; //check if there is a seizure selected / error prevention

    //sends a PATCH request to backend API to update note for specific seizure (by ID)
    //Patch = changes or supporting data designed to update, fix, or improve it
    try {
      const response = await fetch(`${BASE_URL}/api/seizures/${selectedSeizure.id}/note`, {
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ note }),  
      });

      if (!response.ok) throw new Error('Failed to update note'); //checks for errors from server

      const updated = seizures.map(s => //update the seizure array local with new note
        s.id === selectedSeizure.id ? { ...s, note } : s
      );
      //update state and closes the modal
      setSeizures(updated);
      setSelectedSeizure({ ...selectedSeizure, note });
      setModalVisible(false);
    } catch (err) { //if failed, alerts user and logs error
      Alert.alert('Error', 'Could not save note.');
      console.error(err);
    }
  };

  //Generate random high-risk seizure data (for simulating a seizure)
  //based on high heart rate, low oxegyn, movement levels
  const generateCriticalSeizureData = () => {
    const heartRate = Math.floor(Math.random() * 40) + 130; // 130–170
    const spO2 = Math.floor(Math.random() * 5) + 84; // 84–88
    const movement = Math.floor(Math.random() * 10) + 1; // 1–10
    return { heartRate, spO2, movement };
  };

  //get user email from local storage to connect seizure to a user 
  const logSeizure = async () => {
    try {
      const email = await AsyncStorage.getItem('userEmail');
      if (!email) return Alert.alert('Error', 'User not logged in.'); //error if email not found

      const { heartRate, spO2, movement } = generateCriticalSeizureData();
      
      // Create a timestamp for the selected date at the current time/ formats it into ISO string
      const now = new Date();
      const selectedDateTime = new Date(selectedDate);
      selectedDateTime.setHours(now.getHours(), now.getMinutes());
      const timestamp = selectedDateTime.toISOString();

      //create full data object (seixure data) to sent to backend (user, vitals, location, timestamp)
      const payload = {
        epilepsyUserEmail: email,
        latitude: 55.4038,
        longitude: 10.4024,
        heartRate,
        spO2,
        movement,
        timestamp
      };

      //Before wating for server confirmation, optimistically adds seizure to list 
      //ensures user can see it immediately using temporary ID 
      const newSeizure = {
        ...payload,
        id: `temp-${Date.now()}`,
        date: selectedDate,
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        duration: 1,
        movement: movement.toString()
      };
      
      setSeizures(prev => [...prev, newSeizure]);

      //sends seizure data to backend using POST request
      //POST is used to send data to a server to create/update a resource 
      const response = await fetch(`${BASE_URL}/api/seizure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Failed to log seizure');

      // Trigger emergency alert to connected users after seizure is logged
      await triggerSeizureAlert(email);

      Alert.alert('Success', 'Seizure logged successfully and mates notified.');
      
      // Wait a bit before fetching to ensure server has processed the new seizure
      setTimeout(() => {
        fetchSeizures();
      }, 1000);
    } catch (err) { //handle and show error is logging fails
      console.error(err);
      Alert.alert('Error', 'Failed to log seizure.');
    }
  };

  //filter seizures to only show for selected date
  const filteredSeizures = seizures.filter(s => s.date === selectedDate);

  //show one seizure entry with time and a chevron icon (>), opens modal on press
  //render = process where web browsers transform JavaScript code into dynamic content on a webpage
  const renderSeizureItem = ({ item }) => (
    <TouchableOpacity style={styles.seizureItem} onPress={() => handleSeizurePress(item)}>
      <Text style={styles.seizureTime}>Time: {item.time || 'Unknown time'}</Text>
      <Feather name="chevron-right" size={20} color="#4F46E5" />
    </TouchableOpacity>
  );

  //main container for layout and safe screen areas (SafeAreaView) so content aviods screen notches/corners
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar //status bar appearance for iOS and Android
        backgroundColor="#FFFFFF"
        barStyle="dark-content"
        translucent={Platform.OS === 'android'}
      />

      {/*app header: title, height adjust for iOS and Android */}
      <View style={[styles.headerContainer, { height: HEADER_HEIGHT }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Seizure Log</Text>
        </View>
      </View>

      {/*margin top ensures no overlap with custom header */}
      <View style={[styles.container, { marginTop: CONTENT_MARGIN_TOP }]}>
        {/*calendar component with highlighted days with seizures (dots) and selected date */}
        <Calendar
          onDayPress={handleDayPress}
          markedDates={{ //object where each key is a seizure data and each value tells calendar to mark 
            ...seizures.reduce((acc, s) => {  //.reduce() loop through all seizures and build the object/acc=accumulator - growing list
              acc[s.date] = { //for each seizure a new entry is added
                marked: true,
                selected: s.date === selectedDate,
                selectedColor: '#4F46E5',
                dotColor: s.date === selectedDate ? '#FFFFFF' : '#4F46E5'
              };
              return acc;
            }, {}),
            //ensures selected date is still hightlighted if it does not have a seizure/ .every() to confirm no matches
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
        
        {/*display seizures for selected date with refresh and "Log Seizure" button */}
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

      {/*modal pop-up UI component showing full seizure details and editable note field*/}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        {/*avoid keybord covering input (adjust on iOS and Android)*/}
        <KeyboardAvoidingView 
          style={styles.modalContainer} 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={-100}
        >
          {/*scrolable modal content to fit smaller screens or when keyboard is open*/}
          <View style={styles.modalBackground}>
            <TouchableOpacity style={styles.closeIcon} onPress={() => setModalVisible(false)}> {/*'X' button to dismiss/close modal*/}
              <Feather name="x" size={24} color="#4F46E5" />
            </TouchableOpacity>
            <ScrollView 
              style={styles.modalScroll}
              contentContainerStyle={styles.modalContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/*display selected seizure date, time, and details*/}
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
                  {/*input field for adding or editing seizure note*/} 
                  <TextInput
                    style={styles.noteInput}
                    value={note}
                    onChangeText={setNote}
                    multiline
                    placeholder="Add your notes here..."
                    placeholderTextColor="#999"
                  />
                  {/*button to save the note to server */}
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
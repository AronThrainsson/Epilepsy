//react native import block, import of react and hooks (useState & useEffect)
//useState = lets component store and update values (e.g. variables)
//useEffect = runs code when component loads and when certain values change 
import React, { useState, useEffect } from 'react';
//imports UI components from react-native to build screens, layouts, input, modals, alert etc. 
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
//Import UI calendar component (to display and choose dates)
import { Calendar } from 'react-native-calendars';
//Import icons via Expo 
import { Feather } from '@expo/vector-icons';
//Async lets the app save data locally on the device (like a small-database for user settings or saved data)
import AsyncStorage from '@react-native-async-storage/async-storage';
//imports the base URL for backend API calls 
import { BASE_URL } from '../../config';
import { triggerSeizureAlert } from '../services/notificationService';

//Define of functional React component LogScreen, for displaying and managing seizure logs
const LogScreen = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [seizures, setSeizures] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSeizure, setSelectedSeizure] = useState(null);
  const [note, setNote] = useState('');

  const HEADER_HEIGHT = Platform.OS === 'ios' ? 90 : 60;
  const CONTENT_MARGIN_TOP = HEADER_HEIGHT + 20;

  //useEffect runs once when the component mounts = component gets successfully inserted into the DOM, the component is 'mounted'
  //load seizure data (fecthSeizure) from backend when component mounts 
  useEffect(() => {
    fetchSeizures();
  }, []);

  //fetch to interact with backend API, async to get seizure data 
  const fetchSeizures = async () => {
    try {
      const email = await AsyncStorage.getItem('userEmail'); //get user's email from local stoage; exit if not found
      if (!email) return;

      const response = await fetch(`${BASE_URL}/api/seizures?epilepsyUserEmail=${email}`); //call backend API to fetch seizures for the user
      if (!response.ok) throw new Error('Failed to fetch seizures'); //error handling, if server response isn't ok, send error
      const data = await response.json(); //converts respons data into JSON format = text-based format to represent structured data JS syntax

      //Format and clean up seizure data e.g. convert timestamp to readable, set default values is anything missing
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

      //save the processed seizure list to state
      setSeizures(parsed);
    } catch (err) {
      console.error('Error loading seizures:', err); //catch and log errors if fetch or parsing fails
    }
  };

  //pull-to-refresh function / refresh seizure list when user pulls to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSeizures();
    setRefreshing(false);
  };

  //called when user taps a date on the calendar
  //updates selctedDate when tapped on the calendar
  const handleDayPress = (day) => setSelectedDate(day.dateString);

  //open modal and load selected seizure details when tapped / when user taps a seizure entry
  const handleSeizurePress = (seizure) => {
    setSelectedSeizure(seizure);
    setNote(seizure.note || ''); //loads note into input
    setModalVisible(true);
  };

  //ensures there is a selected seizure before saving note 
  const saveNote = async () => {
    if (!selectedSeizure) return;

    //(backend API call) send PATCH request to backend to update the note for the seizure using the selected seizure's id
    try {
      const response = await fetch(`${BASE_URL}/api/seizures/${selectedSeizure.id}/note`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      });

      //checks for errors
      if (!response.ok) throw new Error('Failed to update note');

      //Updates seizure array locally with the new note 
      const updated = seizures.map(s =>
        s.id === selectedSeizure.id ? { ...s, note } : s
      );
      setSeizures(updated); //updates state and closes modal 
      setSelectedSeizure({ ...selectedSeizure, note });
      setModalVisible(false);
    } catch (err) { //error handling, alerts user and logs the error
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

      const payload = {
        epilepsyUserEmail: email,
        latitude: 55.4038,
        longitude: 10.4024,
        heartRate,
        spO2,
        movement
      };

      const response = await fetch(`${BASE_URL}/api/seizure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Failed to log seizure');

      // Trigger notification after successful seizure logging
      await triggerSeizureAlert(email);

      Alert.alert('Success', 'Seizure logged successfully and mates notified.');
      fetchSeizures();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to log seizure.');
    }
  };

  const filteredSeizures = seizures.filter(s => s.date === selectedDate);

  //render a seizure item with time and chevron icon (>) - opens modal on press
  //render = converting code into viewable interactive web content
  const renderSeizureItem = ({ item }) => (
    <TouchableOpacity style={styles.seizureItem} onPress={() => handleSeizurePress(item)}>
      <Text style={styles.seizureTime}>Time: {item.time || 'Unknown time'}</Text>
      <Feather name="chevron-right" size={20} color="#4F46E5" />
    </TouchableOpacity>
  );

  //container that makes sure the content aviod screen notches or coners (especially on phones) safe screen aras
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar //customise status bar appearance for iOS and Android
        backgroundColor="#FFFFFF"
        barStyle="dark-content"
        translucent={Platform.OS === 'android'}
      />

      <View style={[styles.headerContainer, { height: HEADER_HEIGHT }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Seizure Log</Text>
        </View>
      </View>

      <ScrollView
        style={[styles.container, { marginTop: CONTENT_MARGIN_TOP }]}
        contentContainerStyle={styles.scrollContent}
      >
        <Calendar //calendar showing selected day and marking dates with seizures
          onDayPress={handleDayPress}
          markedDates={{ //highlights selected day and shows 'dot' for seizure days
            [selectedDate]: { selected: true, selectedColor: '#4F46E5' },
            ...seizures.reduce((acc, s) => { //reduce()=list of marked dates from seizures
              acc[s.date] = { marked: true, dotColor: '#4F46E5' };
              return acc;
            }, {})
          }}
          theme={{ //customises colours 
            selectedDayBackgroundColor: '#4F46E5',
            todayTextColor: '#4F46E5',
            arrowColor: '#4F46E5',
          }}
          style={styles.calendar}
        />

        {/* tite showing the data for the displayed seizures */}
        <Text style={styles.sectionTitle}>Seizures on {selectedDate}</Text>
        <FlatList /*list of seizures for selected date with pull-to-refresh support */
          data={filteredSeizures}
          keyExtractor={(item, i) => `${item.timestamp}-${i}`}
          renderItem={renderSeizureItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
        />

        <TouchableOpacity style={styles.logButton} onPress={logSeizure}>
          <Text style={styles.logButtonText}>+ Log Seizure</Text>
        </TouchableOpacity>

        <Modal
          visible={modalVisible} /*determines if open or hiddden*/
          transparent /*dims the background */
          animationType="slide" /*control how it appears --> slides */
          onRequestClose={() => setModalVisible(false)} /*allows for button to clode it*/
        >
          {/*avoid keyborad covering the input field*/}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContainer}
          >
            {/*scrollable modal content to fit smaller screens */}
            <View style={styles.modalBackground}>
              <ScrollView contentContainerStyle={styles.modalContent}>
                <TouchableOpacity style={styles.closeIcon} onPress={() => setModalVisible(false)}> {/*a button with 'X' icon to clode the modal */}
                  <Feather name="x" size={24} color="#4F46E5" />
                </TouchableOpacity>
                {selectedSeizure && ( //only render if seizure is selected / display selected seizure's date, time and sensor details
                  <>
                    <Text style={styles.modalTitle}>Seizure Details</Text>
                    <Text>Date: {selectedSeizure.date}</Text>
                    <Text>Time: {selectedSeizure.time}</Text>
                    <Text>Duration: {selectedSeizure.duration} minutes</Text>
                    <Text>Heart Rate: {selectedSeizure.heartRate} bpm</Text>
                    <Text>SpO2: {selectedSeizure.spO2}%</Text>
                    <Text>Movement: {selectedSeizure.movement}</Text>
                    <TextInput //multiline input for user to add/edit seizure notes
                      style={styles.noteInput}
                      value={note} //hook into state / hook = replacing or extending the default behavior with a custom behavior for specific events
                      onChangeText={setNote} //hook into state
                      multiline
                      placeholder="Add your notes here..."
                    />
                    <TouchableOpacity style={styles.saveButton} onPress={saveNote}> {/*button to save note to server*/}
                      <Text style={styles.saveButtonText}>Save Note</Text>
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
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
    paddingHorizontal: 16,
    backgroundColor: '#fff'
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
    borderColor: '#CCC',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    minHeight: 60,
    textAlignVertical: 'top'
  },
  saveButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center'
  },
  saveButtonText: {
    color: '#FFF',
    fontWeight: 'bold'
  },
  logButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    marginHorizontal: 20
  },
  logButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16
  },
  closeIcon: {
    alignSelf: 'flex-end'
  }
});

export default LogScreen;
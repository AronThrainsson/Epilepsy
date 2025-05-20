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
import { Calendar } from 'react-native-calendars';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../config';

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
      const role = await AsyncStorage.getItem('userRole'); //retrieves user role form local storage to load seizure, exit if not found
      if (!email || !role) return;
  
      //set API endpoint based on user role (support vs epilepsy user)
      const endpoint =
        role === 'support'
          ? `${BASE_URL}/api/seizures?supportUserEmail=${email}`
          : `${BASE_URL}/api/seizures?epilepsyUserEmail=${email}`;
  
      const response = await fetch(endpoint); //call API to fetch endpoint
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
      //updates variable seizure with data fetched from backend
      setSeizures(parsed);
    } catch (err) {
      //logs error if fetch or parsing fails
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
            ...seizures.reduce((acc, s) => { //.reduce() loop through all seizures and build the object/acc=accumulator - growing list
              if (s.date === selectedDate) { //checks if seizure data is same as date user tapped/selected
                acc[s.date] = { //for each seizure a new entry is added
                  selected: true,
                  marked: true,
                  selectedColor: '#4F46E5',
                  dotColor: '#4F46E5'
                };
              } else { //mark seizure dates (not selected) with only a dot
                acc[s.date] = {
                  marked: true,
                  dotColor: '#4F46E5'
                };
              }
              return acc; //return accumulator with all marked seizure dates
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
        
        {/*display seizures for selected date with refresh*/}
        <FlatList
          data={filteredSeizures}
          keyExtractor={(item, i) => `${item.timestamp}-${i}`}
          renderItem={renderSeizureItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
          style={styles.flatListContainer}
        />
      </View>

      {/*modal pop-up UI component showing full seizure details and editable note field*/}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        {/*prevents keyboard from overlapping input fields*/}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          {/*main modal content container with background styling*/}
          <View style={styles.modalBackground}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <TouchableOpacity style={styles.closeIcon} onPress={() => setModalVisible(false)}> {/* Close button to hide the modal */}
                <Feather name="x" size={24} color="#4F46E5" />
              </TouchableOpacity>
              {selectedSeizure && (
                <> {/*displays selected seizure details, only renders if selectedSEizure is not null*/}
                  <Text style={styles.modalTitle}>Seizure Details</Text>
                  <Text>Date: {selectedSeizure.date}</Text>
                  <Text>Time: {selectedSeizure.time}</Text>
                  <Text>Duration: {selectedSeizure.duration} minutes</Text>
                  <Text>Heart Rate: {selectedSeizure.heartRate} bpm</Text>
                  <Text>SpO2: {selectedSeizure.spO2}%</Text>
                  <Text>Movement: {selectedSeizure.movement}</Text>
                  {/*input field for adding or editing seizure note*/} 
                  <TextInput 
                    style={styles.noteInput}
                    value={note}
                    onChangeText={setNote}
                    multiline
                    placeholder="Add your notes here..."
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
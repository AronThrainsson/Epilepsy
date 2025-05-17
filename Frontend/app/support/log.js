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
import { Feather } from '@expo/vector-icons';
//Import icons via Expo
import { useRouter } from 'expo-router';
//Async lets the app save data locally on the device (like a small-database for user settings or saved data)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../config';
//imports the base URL for backend API calls 
import { Feather, MaterialIcons } from '@expo/vector-icons';

const LogScreen = () => {
//Define of functional React component LogScreen, for displaying and managing seizure logs
const LogScreen = () => { 
  //useState calls to store data and track UI behaviour / keep track of selected data (YYYY/MM/DD)
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [seizures, setSeizures] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [seizures, setSeizures] = useState([]); //array of seizure records fetched from backend
  const [selectedSeizure, setSelectedSeizure] = useState(null);
  const [note, setNote] = useState('');

  // Adjust layout depending on whether it is running on iOs or Andriod / add extra spacing for content positioning
  const HEADER_HEIGHT = Platform.OS === 'ios' ? 90 : 60;
  const CONTENT_MARGIN_TOP = HEADER_HEIGHT + 20;

  useEffect(() => {
    fetchSeizures();
  }, []);

  const fetchSeizures = async () => {
  //load seizure from local stoage (asyncStorage)
  const loadSeizures = async () => {
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
      const storedSeizures = await AsyncStorage.getItem('seizures'); //AsyncStorage.getItem = loads previously saved data locally (not from server)
      if (storedSeizures) {
        let parsedSeizures = JSON.parse(storedSeizures);
        parsedSeizures = parsedSeizures.map(seizure => ({
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
    await fetchSeizures();
    setRefreshing(false);
  };

  const handleDayPress = (day) => setSelectedDate(day.dateString);
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
    setNote(seizure.note || '');
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
  closeIcon: {
    position: 'absolute',
    top: 16,
    right: 16
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
});

export default LogScreen;
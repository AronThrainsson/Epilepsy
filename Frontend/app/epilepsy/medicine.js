import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Platform,
  Switch
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MedicationPage = () => {
  const [medicines, setMedicines] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [time, setTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    const loadMedications = async () => {
      try {
        const savedMeds = await AsyncStorage.getItem('medications');
        if (savedMeds) {
          const parsedMeds = JSON.parse(savedMeds);
          const medsWithToggle = parsedMeds.map(med => ({
            ...med,
            enabled: med.enabled !== undefined ? med.enabled : true
          }));
          setMedicines(medsWithToggle);
        } else {
          const defaultMeds = [
            { id: '1', name: 'Epilex', dose: '200mg', time: '08:00', enabled: true },
            { id: '2', name: 'Keppra', dose: '500mg', time: '20:00', enabled: true },
          ];
          setMedicines(defaultMeds);
          await AsyncStorage.setItem('medications', JSON.stringify(defaultMeds));
        }
      } catch (error) {
        console.error('Failed to load medications', error);
      }
    };
    loadMedications();
  }, []);

  useEffect(() => {
    const saveMedications = async () => {
      try {
        await AsyncStorage.setItem('medications', JSON.stringify(medicines));
      } catch (error) {
        console.error('Failed to save medications', error);
      }
    };
    saveMedications();
  }, [medicines]);

  useEffect(() => {
    if (selectedMedicine) {
      setName(selectedMedicine.name);
      setDose(selectedMedicine.dose);
      const [hours, minutes] = selectedMedicine.time.split(':');
      const newTime = new Date();
      newTime.setHours(parseInt(hours));
      newTime.setMinutes(parseInt(minutes));
      setTime(newTime);
    } else {
      setName('');
      setDose('');
      const defaultTime = new Date();
      defaultTime.setHours(8, 0);
      setTime(defaultTime);
    }
  }, [selectedMedicine]);

  const handleSave = async () => {
    const hours = time.getHours().toString().padStart(2, '0');
    const minutes = time.getMinutes().toString().padStart(2, '0');
    const formattedTime = `${hours}:${minutes}`;

    const updatedMedicine = {
      id: selectedMedicine?.id || Date.now().toString(),
      name,
      dose,
      time: formattedTime,
      enabled: selectedMedicine ? selectedMedicine.enabled : true
    };

    if (selectedMedicine) {
      setMedicines(medicines.map(m => (m.id === updatedMedicine.id ? updatedMedicine : m)));
    } else {
      setMedicines([...medicines, updatedMedicine]);
    }
    setIsModalVisible(false);
  };

  const handleDelete = () => {
    if (selectedMedicine) {
      setMedicines(medicines.filter(m => m.id !== selectedMedicine.id));
      setIsModalVisible(false);
    }
  };

  const toggleMedication = (id) => {
    const updatedMeds = medicines.map(med =>
      med.id === id ? { ...med, enabled: !med.enabled } : med
    );
    setMedicines(updatedMeds);
  };

  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setTime(selectedTime);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My medications</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setSelectedMedicine(null);
            setIsModalVisible(true);
          }}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.listContainer}>
        {medicines.map((item) => (
          <View key={item.id} style={[
            styles.medicineItemContainer,
            !item.enabled && styles.disabledMedicine
          ]}>
            <TouchableOpacity
              style={styles.medicineButton}
              onPress={() => {
                setSelectedMedicine(item);
                setIsModalVisible(true);
              }}
            >
              <View style={styles.medicineInfo}>
                <Text style={styles.medicineName}>{item.name}</Text>
                <Text style={styles.medicineDetails}>{item.dose} • {item.time}</Text>
              </View>
            </TouchableOpacity>
            <Switch
              value={item.enabled}
              onValueChange={() => toggleMedication(item.id)}
              trackColor={{ false: "#767577", true: "#32BF55" }}
              thumbColor={item.enabled ? "#ffffff" : "#f4f3f4"}
              ios_backgroundColor="#3e3e3e"
            />
          </View>
        ))}
      </ScrollView>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              {selectedMedicine && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleDelete}
                >
                  <Icon name="trash-can" size={24} color="#FF3B30" />
                </TouchableOpacity>
              )}
              <Text style={styles.modalTitle}>
                {selectedMedicine ? 'Edit Medication' : 'Add Medication'}
              </Text>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>Medicine Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="E.g. Epilex"
                autoCapitalize="words"
              />

              <Text style={styles.label}>Dosage</Text>
              <TextInput
                style={styles.input}
                value={dose}
                onChangeText={setDose}
                placeholder="E.g. 200mg"
              />

              <Text style={styles.label}>Time</Text>
              <TouchableOpacity
                style={styles.timeInput}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.timeText}>
                  {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>

              {showTimePicker && (
                <DateTimePicker
                  value={time}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onTimeChange}
                  style={styles.timePicker}
                />
              )}
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={[styles.buttonText, { color: '#000' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
              >
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingLeft: 16,
    paddingRight: 16,
    top: -15,
    marginBottom: -30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#2E3A59',
    marginBottom: 40,
  },
  addButton: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  addButtonText: {
    color: 'black',
    fontSize: 40,
    textAlign: 'center'
  },
  listContainer: {
    flex: 1
  },
  medicineItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  disabledMedicine: {
    opacity: 0.6
  },
  medicineButton: {
    flex: 1
  },
  medicineInfo: {
    flex: 1
  },
  medicineName: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4
  },
  medicineDetails: {
    color: '#666'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    maxHeight: '80%'
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    justifyContent: 'center',
    position: 'relative'
  },
  deleteButton: {
    position: 'absolute',
    left: 0,
    padding: 10
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  form: {
    marginBottom: 20
  },
  label: {
    marginBottom: 8,
    fontWeight: '600',
    fontSize: 16
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16
  },
  timeText: {
    fontSize: 16
  },
  timePicker: {
    marginBottom: 20
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 10
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelButton: {
    backgroundColor: '#e0e0e0',
    marginRight: 10
  },
  saveButton: {
    backgroundColor: '#CB97F0'
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16
  }
});

export default MedicationPage;

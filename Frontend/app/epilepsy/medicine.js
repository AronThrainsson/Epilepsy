import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Dimensions,
  Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const MedicationPage = () => {
  const [medicines, setMedicines] = useState([
    { id: '1', name: 'Epilex', dose: '200mg', time: '08:00' },
    { id: '2', name: 'Keppra', dose: '500mg', time: '20:00' },
  ]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [time, setTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (selectedMedicine) {
      setName(selectedMedicine.name);
      setDose(selectedMedicine.dose);
      const [hours, minutes] = selectedMedicine.time.split(':');
      const newTime = new Date();
      newTime.setHours(parseInt(hours), parseInt(minutes));
      setTime(newTime);
    } else {
      setName('');
      setDose('');
      setTime(new Date());
    }
  }, [selectedMedicine]);

  const handleSave = () => {
    const formattedTime = time.toTimeString().substring(0, 5);
    const updatedMedicine = {
      id: selectedMedicine?.id || Date.now().toString(),
      name,
      dose,
      time: formattedTime
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

  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setTime(selectedTime);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header and Medication List */}
      <View style={styles.header}>
        <Text style={styles.title}>My Medications</Text>
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
          <TouchableOpacity
            key={item.id}
            style={styles.medicineButton}
            onPress={() => {
              setSelectedMedicine(item);
              setIsModalVisible(true);
            }}
          >
            <Text style={styles.medicineName}>{item.name}</Text>
            <Text style={styles.medicineDetails}>{item.dose} • {item.time}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Edit Medication Modal */}
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
                  <Text style={styles.deleteButtonText}>🗑️</Text>
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
                <Text style={styles.buttonText}>Cancel</Text>
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
    padding: 16,
    backgroundColor: '#fff'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold'
  },
  addButton: {
    backgroundColor: '#4F46E5',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 24,
    lineHeight: 36
  },
  listContainer: {
    flex: 1
  },
  medicineButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
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
    justifyContent: 'center'
  },
  deleteButton: {
    position: 'absolute',
    left: 0,
    padding: 10
  },
  deleteButtonText: {
    fontSize: 20
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
    marginTop: 10
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
    backgroundColor: '#4F46E5'
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16
  }
});

export default MedicationPage;
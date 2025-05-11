import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import EditMedicineModal from './EditMedicineModal';

export default function MedicationListScreen() {
  const [medicines, setMedicines] = useState([
    { id: '1', name: 'Epilex', dose: '200mg', time: '08:00' },
    { id: '2', name: 'Keppra', dose: '500mg', time: '20:00' },
  ]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);

  const handleSave = (updatedMedicine) => {
    if (selectedMedicine) {
      setMedicines(medicines.map(m => (m.id === updatedMedicine.id ? updatedMedicine : m)));
    } else {
      setMedicines([...medicines, { ...updatedMedicine, id: Date.now().toString() }]);
    }
    setIsModalVisible(false);
  };

  return (
    <View style={styles.container}>
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

      <EditMedicineModal
        visible={isModalVisible}
        medicine={selectedMedicine}
        onSave={handleSave}
        onClose={() => setIsModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: 'bold' },
  addButton: {
    backgroundColor: '#4F46E5',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: { color: 'white', fontSize: 24, lineHeight: 36 },
  listContainer: { flex: 1 },
  medicineButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  medicineName: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  medicineDetails: { color: '#666' },
});
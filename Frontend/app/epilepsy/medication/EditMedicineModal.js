import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import TimePicker from "../../../components/TimePicker";

export default function EditMedicineModal({ visible, medicine, onSave, onClose }) {
  const [time, setTime] = useState(medicine?.time || '08:00');
  const [name, setName] = useState(medicine?.name || '');
  const [dose, setDose] = useState(medicine?.dose || '');

  const handleSave = () => onSave({ ...(medicine || {}), time, name, dose });

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Edit Medication</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form}>
          <Text style={styles.label}>Time</Text>
          <TimePicker selectedTime={time} onTimeChange={setTime} />

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
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: { fontWeight: 'bold', fontSize: 18 },
  cancelText: { color: '#FF3B30', fontSize: 16 },
  saveText: { color: '#007AFF', fontSize: 16 },
  form: { padding: 16 },
  label: { fontWeight: '600', marginTop: 16, marginBottom: 8, fontSize: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
});
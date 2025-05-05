import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { BASE_URL } from '../../config';

export default function SupportScreen() {
  const [supportUsers, setSupportUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [epilepsyEmail, setEpilepsyEmail] = useState('');
  const [searchText, setSearchText] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      const fetchEmail = async () => {
        const storedEmail = await AsyncStorage.getItem('userEmail');
        if (storedEmail) setEpilepsyEmail(storedEmail);
      };
      fetchEmail();
    }, [])
  );

  useEffect(() => {
    fetch(`${BASE_URL}/api/support-users`)
      .then((res) => res.json())
      .then((data) => {
        console.log('Support users api response:', data); // log
        setSupportUsers(data);
        setFilteredUsers(data);
      })
      .catch((err) => console.error('Error fetching support users:', err));
  }, []);

  const toggleSelect = (email) => {
    setSelected((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  const handleSave = async () => {
    if (!epilepsyEmail) {
      Alert.alert('Error', 'Could not find your user email');
      return;
    }

    try {
      for (const supportEmail of selected) {
        await fetch(`${BASE_URL}/api/user/add-support`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            epilepsyUserEmail: epilepsyEmail,
            supportUserEmail: supportEmail,
          }),
        });
      }
      Alert.alert('Support team updated!');
    } catch (err) {
      Alert.alert('Error saving support users');
      console.error(err);
    }
  };

  const handleSearch = (text) => {
    setSearchText(text);
    const filtered = supportUsers.filter((user) =>
      user.email.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredUsers(filtered);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Support Team</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Search by email"
        value={searchText}
        onChangeText={handleSearch}
      />

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.email}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.item,
              selected.includes(item.email) && styles.selectedItem,
            ]}
            onPress={() => toggleSelect(item.email)}
          >
            <Text style={styles.itemText}>
              {item.firstName} {item.surname} ({item.email})
            </Text>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <Text style={styles.buttonText}>Save Support Team</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  item: {
    padding: 14,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 10,
  },
  selectedItem: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  itemText: { fontSize: 16 },
  button: {
    backgroundColor: '#3b82f6',
    padding: 14,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonText: { color: '#fff', textAlign: 'center', fontSize: 16 },
});
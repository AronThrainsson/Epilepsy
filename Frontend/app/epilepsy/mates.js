import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { BASE_URL } from '../../config';
import { MaterialIcons } from '@expo/vector-icons';

export default function SupportScreen() {
  const [supportUsers, setSupportUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [epilepsyEmail, setEpilepsyEmail] = useState('');
  const [searchText, setSearchText] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      const fetchData = async () => {
        // Load user email
        const storedEmail = await AsyncStorage.getItem('userEmail');
        if (storedEmail) setEpilepsyEmail(storedEmail);

        // Load previously selected mates
        const storedMates = await AsyncStorage.getItem('activatedMatesEmails');
        if (storedMates) {
          setSelected(JSON.parse(storedMates));
        }
      };
      fetchData();
    }, [])
  );

  useEffect(() => {
    fetch(`${BASE_URL}/api/support-users`)
      .then((res) => res.json())
      .then((data) => {
        console.log('Support users api response:', data);
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

      // Store both display names and emails
      const selectedMates = supportUsers
        .filter(user => selected.includes(user.email))
        .map(user => `${user.firstName} ${user.surname}`);

      const selectedEmails = supportUsers
        .filter(user => selected.includes(user.email))
        .map(user => user.email);

      await AsyncStorage.setItem('activatedMates', JSON.stringify(selectedMates));
      await AsyncStorage.setItem('activatedMatesEmails', JSON.stringify(selectedEmails));

      Alert.alert('Mates updated!');
    } catch (err) {
      Alert.alert('Error saving mates');
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
      <Text style={styles.title}>My mates</Text>

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
            <View style={styles.itemContent}>
              <Text style={styles.itemText}>
                {item.firstName} {item.surname} ({item.email})
              </Text>
              {selected.includes(item.email) ? (
                <MaterialIcons name="check-circle" size={24} color="#CB97F0" />
              ) : (
                <MaterialIcons name="radio-button-unchecked" size={24} color="#ccc" />
              )}
            </View>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <Text style={styles.buttonText}>Save mates</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingLeft: 16,
    paddingRight: 16,
    top: -15,
    marginBottom: -30,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#2E3A59',
    marginBottom: 40,
   },
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
    backgroundColor: '#EFE6FF',
    borderColor: '#9747FF',
  },
  itemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 16,
    flex: 1,
   },
  button: {
    backgroundColor: '#CB97F0',
    padding: 14,
    borderRadius: 8,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 16,
  },
});
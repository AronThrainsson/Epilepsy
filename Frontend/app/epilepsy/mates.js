import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Platform
} from 'react-native';
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

  // Platform-specific header height
  const HEADER_HEIGHT = Platform.OS === 'ios' ? 90 : 60;
  const CONTENT_MARGIN_TOP = HEADER_HEIGHT + 20;

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

  const toggleSelect = async (email) => {
    const newSelected = selected.includes(email)
      ? selected.filter((e) => e !== email)
      : [...selected, email];

    setSelected(newSelected);

    if (!epilepsyEmail) return;

    try {
      // Update the backend
      await fetch(`${BASE_URL}/api/user/add-support`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          epilepsyUserEmail: epilepsyEmail,
          supportUserEmail: email,
        }),
      });

      // Update local storage
      const selectedMates = supportUsers
        .filter(user => newSelected.includes(user.email))
        .map(user => `${user.firstName} ${user.surname}`);

      const selectedEmails = supportUsers
        .filter(user => newSelected.includes(user.email))
        .map(user => user.email);

      await AsyncStorage.setItem('activatedMates', JSON.stringify(selectedMates));
      await AsyncStorage.setItem('activatedMatesEmails', JSON.stringify(selectedEmails));
    } catch (err) {
      console.error('Error updating mate:', err);
      // Revert selection if there was an error
      setSelected(selected);
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        backgroundColor="#FFFFFF"
        barStyle="dark-content"
        translucent={Platform.OS === 'android'}
      />

      {/* Header */}
      <View style={[styles.headerContainer, { height: HEADER_HEIGHT }]}>
        <View style={styles.header}>
          <Text style={styles.title}>My mates</Text>
        </View>
      </View>

      {/* Content with proper margin to avoid header overlap */}
      <ScrollView
        style={[styles.container, { marginTop: CONTENT_MARGIN_TOP }]}
        contentContainerStyle={styles.scrollContent}
      >
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
          scrollEnabled={false}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

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
  },
  scrollContent: {
    paddingBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#2E3A59',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 40
  },
  item: {
    padding: 14,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
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
    color: '#2E3A59',
  },
});
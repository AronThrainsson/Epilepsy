import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, SafeAreaView, StatusBar, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { BASE_URL } from '../../config';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function SupportScreen() {
  const [supportUsers, setSupportUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [epilepsyEmail, setEpilepsyEmail] = useState('');
  const [searchText, setSearchText] = useState('');
  const router = useRouter();

  // Platform-specific header height
  const HEADER_HEIGHT = Platform.OS === 'ios' ? 90 : 60;

  useFocusEffect(
    React.useCallback(() => {
      const fetchData = async () => {
        try {
          // Load user email
          const storedEmail = await AsyncStorage.getItem('userEmail');
          if (!storedEmail) {
            console.log('No user email found');
            return;
          }
          
          console.log('Using email:', storedEmail);
          setEpilepsyEmail(storedEmail);

          // Try loading previously selected mates from storage
          try {
            const teamData = await AsyncStorage.getItem(`team_${storedEmail}`);
            if (teamData) {
              const parsedTeam = JSON.parse(teamData);
              if (Array.isArray(parsedTeam)) {
                setSelected(parsedTeam);
                console.log('Loaded selected emails:', parsedTeam);
              }
            }
          } catch (e) {
            console.warn('Error loading team data:', e);
          }

          // Load all support users
          try {
            const supportResponse = await fetch(`${BASE_URL}/api/support-users`);
            if (supportResponse.ok) {
              const supportData = await supportResponse.json();
              console.log('Support users loaded:', supportData.length);
              
              // Make sure all support users have isAvailable property
              const processedData = supportData.map(user => ({
                ...user,
                isAvailable: user.isAvailable !== undefined ? user.isAvailable : true
              }));
              
              setSupportUsers(processedData);
              setFilteredUsers(processedData);
            } else {
              console.warn('Failed to fetch support users');
            }
          } catch (err) {
            console.warn('Error fetching support users:', err);
          }
        } catch (err) {
          console.error('Error in fetchData:', err);
        }
      };

      fetchData();
    }, [])
  );

  const saveTeamData = async (selectedEmails) => {
    try {
      if (!epilepsyEmail) return false;
      
      // Save the raw selection
      await AsyncStorage.setItem(`team_${epilepsyEmail}`, JSON.stringify(selectedEmails));
      
      // Create full mate objects with availability
      const fullMates = selectedEmails.map(email => {
        const mate = supportUsers.find(user => user.email === email);
        return {
          email: email,
          name: mate ? `${mate.firstName} ${mate.surname}` : email.split('@')[0],
          isAvailable: mate ? mate.isAvailable : true
        };
      });
      
      // Save formatted mates for home page
      const matesJson = JSON.stringify(fullMates);
      await AsyncStorage.setItem(`formatted_mates_${epilepsyEmail}`, matesJson);
      await AsyncStorage.setItem(`activatedMates_${epilepsyEmail}`, matesJson);
      
      // Sync with server with concurrency handling
      // First get current team members from server to avoid conflicts
      let currentTeamMembers = [];
      try {
        const response = await fetch(`${BASE_URL}/api/user/${encodeURIComponent(epilepsyEmail)}/team`);
        if (response.ok) {
          const teamData = await response.json();
          currentTeamMembers = teamData.teamMembers?.map(member => member.email) || [];
        }
      } catch (error) {
        console.warn('Error getting current team members:', error);
      }
      
      // Process team members with a slight delay between each to avoid concurrency issues
      for (const email of selectedEmails) {
        // Only add if not already on the team
        if (!currentTeamMembers.includes(email)) {
          try {
            console.log(`Adding ${email} to team...`);
            const response = await fetch(`${BASE_URL}/api/user/team/manage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                epilepsyUserEmail: epilepsyEmail,
                supportUserEmail: email,
                activate: true
              })
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              console.warn(`Error adding ${email} to team: ${errorText}`);
            } else {
              console.log(`Successfully added ${email} to team`);
            }
            
            // Add a small delay between requests to avoid database conflicts
            await new Promise(resolve => setTimeout(resolve, 300));
            
          } catch (error) {
            console.warn(`Error syncing ${email} with server:`, error);
          }
        }
      }
      
      // Check for team members to remove
      for (const email of currentTeamMembers) {
        if (!selectedEmails.includes(email)) {
          try {
            console.log(`Removing ${email} from team...`);
            const response = await fetch(`${BASE_URL}/api/user/team/manage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                epilepsyUserEmail: epilepsyEmail,
                supportUserEmail: email,
                activate: false
              })
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              console.warn(`Error removing ${email} from team: ${errorText}`);
            }
            
            // Add a small delay between requests
            await new Promise(resolve => setTimeout(resolve, 300));
            
          } catch (error) {
            console.warn(`Error removing ${email} from team:`, error);
          }
        }
      }
      
      return true;
    } catch (e) {
      console.error('Error saving team data:', e);
      return false;
    }
  };

  const handleBackToHome = async () => {
    if (epilepsyEmail && selected) {
      // Save before navigating
      await saveTeamData(selected);
      
      // Small delay to ensure data is saved
      setTimeout(() => {
        router.push('/epilepsy');
      }, 100);
    } else {
      router.push('/epilepsy');
    }
  };

  const toggleSelect = async (email) => {
    const isCurrentlySelected = selected.includes(email);
    const newSelected = isCurrentlySelected 
      ? selected.filter(e => e !== email)
      : [...selected, email];
    
    setSelected(newSelected);
    
    // Save changes
    await saveTeamData(newSelected);
  };

  const handleSearch = (text) => {
    setSearchText(text);
    if (!supportUsers) return;
    
    const filtered = supportUsers.filter((user) =>
      user.email.toLowerCase().includes(text.toLowerCase()) ||
      user.firstName.toLowerCase().includes(text.toLowerCase()) ||
      user.surname.toLowerCase().includes(text.toLowerCase())
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
      <View style={styles.headerContainer}>
        <Text style={styles.title}>My mates</Text>
      </View>

      {/* Content */}
      <View style={styles.container}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by email or name"
          value={searchText}
          onChangeText={handleSearch}
        />

        {supportUsers.length > 0 ? (
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
                  <View style={styles.userInfo}>
                    <Text style={styles.itemText}>
                      {item.firstName} {item.surname}
                    </Text>
                    <Text style={styles.emailText}>{item.email}</Text>
                    <Text style={[
                      styles.availabilityText,
                      item.isAvailable ? styles.availableText : styles.unavailableText
                    ]}>
                      {item.isAvailable ? 'Available' : 'Currently Unavailable'}
                    </Text>
                  </View>
                  {selected.includes(item.email) ? (
                    <MaterialIcons name="check-circle" size={24} color="#CB97F0" />
                  ) : (
                    <MaterialIcons name="radio-button-unchecked" size={24} color="#ccc" />
                  )}
                </View>
              </TouchableOpacity>
            )}
          />
        ) : (
          <Text style={styles.noMatesText}>No support users found</Text>
        )}
        
        {/* Save button */}
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={handleBackToHome}
        >
          <Text style={styles.saveButtonText}>Save & Done</Text>
        </TouchableOpacity>
      </View>
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
    height: Platform.OS === 'ios' ? 90 : 60,
    paddingTop: Platform.OS === 'ios' ? 40 : 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: '#F9F0FF',
  },
  container: {
    flex: 1,
    padding: 16,
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
    marginBottom: 20,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
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
    color: '#2E3A59',
  },
  userInfo: {
    flex: 1,
  },
  availabilityText: {
    fontSize: 12,
    marginTop: 4,
  },
  availableText: {
    color: '#4CAF50',
  },
  unavailableText: {
    color: '#666',
    fontStyle: 'italic',
  },
  emailText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  noMatesText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  saveButton: {
    backgroundColor: '#CB97F0',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 30,
    marginBottom: 20,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
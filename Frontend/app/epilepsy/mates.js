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
            // First try loading from persistent storage
            const persistentSelectedMates = await AsyncStorage.getItem(`persistent_selected_mates_${storedEmail}`);
            if (persistentSelectedMates) {
              const selectedEmails = JSON.parse(persistentSelectedMates);
              console.log('Loaded selected emails from persistent storage:', selectedEmails);
              setSelected(selectedEmails);
              
              // Restore team data from persistent storage if needed
              const persistentTeamData = await AsyncStorage.getItem(`persistent_team_${storedEmail}`);
              if (persistentTeamData) {
                await AsyncStorage.setItem(`team_${storedEmail}`, persistentTeamData);
                console.log('Restored team data from persistent storage');
              }
            } else {
              // If no persistent data, try regular storage
              const selectedMates = await AsyncStorage.getItem(`selected_mates_${storedEmail}`);
              if (selectedMates) {
                const selectedEmails = JSON.parse(selectedMates);
                console.log('Loaded selected emails from selected_mates:', selectedEmails);
                setSelected(selectedEmails);
              } else {
                // If no selected_mates found, try loading from team data
                const teamData = await AsyncStorage.getItem(`team_${storedEmail}`);
                if (teamData) {
                  const parsedTeam = JSON.parse(teamData);
                  if (parsedTeam.teamMembers && Array.isArray(parsedTeam.teamMembers)) {
                    const selectedEmails = parsedTeam.teamMembers.map(member => member.email);
                    console.log('Loaded selected emails from team data:', selectedEmails);
                    setSelected(selectedEmails);
                  }
                }
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
      
      await AsyncStorage.setItem(`selected_mates_${epilepsyEmail}`, JSON.stringify(selectedEmails));
      await AsyncStorage.setItem(`persistent_selected_mates_${epilepsyEmail}`, JSON.stringify(selectedEmails));
      
      const fullMates = selectedEmails.map(email => {
        const mate = supportUsers.find(user => user.email === email);
        return {
          email: email,
          firstName: mate ? mate.firstName : email.split('@')[0],
          surname: mate ? mate.surname : '',
          isAvailable: mate ? mate.isAvailable : true,
          role: 'support'
        };
      });

      const teamData = {
        epilepsyUser: {
          email: epilepsyEmail,
          firstName: await AsyncStorage.getItem('userFirstName') || epilepsyEmail.split('@')[0],
          surname: await AsyncStorage.getItem('userSurname') || ''
        },
        teamMembers: fullMates
      };
      
      await AsyncStorage.setItem(`team_${epilepsyEmail}`, JSON.stringify(teamData));
      await AsyncStorage.setItem(`persistent_team_${epilepsyEmail}`, JSON.stringify(teamData));
      await AsyncStorage.setItem(`team_members_${epilepsyEmail}`, JSON.stringify(fullMates));
      await AsyncStorage.setItem(`persistent_team_members_${epilepsyEmail}`, JSON.stringify(fullMates));
      
      for (const mate of fullMates) {
        try {
          let supportUserTeams = [];
          
          const persistentTeams = await AsyncStorage.getItem(`persistent_all_teams_${mate.email}`);
          if (persistentTeams) {
            supportUserTeams = JSON.parse(persistentTeams);
          } else {
            const existingTeams = await AsyncStorage.getItem(`all_teams_${mate.email}`);
            if (existingTeams) {
              supportUserTeams = JSON.parse(existingTeams);
            }
          }

          const teamInfo = {
            firstName: teamData.epilepsyUser.firstName,
            surname: teamData.epilepsyUser.surname,
            email: epilepsyEmail,
            teamSize: fullMates.length
          };

          const existingIndex = supportUserTeams.findIndex(t => t.email === epilepsyEmail);
          if (existingIndex >= 0) {
            supportUserTeams[existingIndex] = teamInfo;
          } else {
            supportUserTeams.push(teamInfo);
          }

          await AsyncStorage.setItem(`all_teams_${mate.email}`, JSON.stringify(supportUserTeams));
          await AsyncStorage.setItem(`persistent_all_teams_${mate.email}`, JSON.stringify(supportUserTeams));
          await AsyncStorage.setItem(`team_${mate.email}_${epilepsyEmail}`, JSON.stringify(teamData));
          await AsyncStorage.setItem(`persistent_team_${mate.email}_${epilepsyEmail}`, JSON.stringify(teamData));
          await AsyncStorage.setItem(`current_team_${mate.email}`, JSON.stringify(teamData));
          await AsyncStorage.setItem(`persistent_current_team_${mate.email}`, JSON.stringify(teamData));
          
          await AsyncStorage.flushGetRequests();
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch {}
      }
      
      let currentTeamMembers = [];
      try {
        const response = await fetch(`${BASE_URL}/api/user/${encodeURIComponent(epilepsyEmail)}/team`);
        if (response.ok) {
          const serverTeamData = await response.json();
          currentTeamMembers = serverTeamData.teamMembers?.map(member => member.email) || [];
        }
      } catch {}
      
      for (const email of selectedEmails) {
        if (!currentTeamMembers.includes(email)) {
          try {
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
              throw new Error(errorText);
            }
            
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch {}
        }
      }
      
      for (const email of currentTeamMembers) {
        if (!selectedEmails.includes(email)) {
          try {
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
              throw new Error(errorText);
            }
          } catch {}
        }
      }
      
      return true;
    } catch {
      return false;
    }
  };

  const handleBackToHome = () => {
    // Navigate immediately
    router.push('/epilepsy');
    
    // Save data in the background after navigation
    if (epilepsyEmail && selected) {
      setTimeout(() => {
        saveTeamData(selected).catch(error => {
          console.warn('Error saving team data in background:', error);
        });
      }, 0);
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
                      {item.isAvailable ? 'Available' : 'Unavailable'}
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
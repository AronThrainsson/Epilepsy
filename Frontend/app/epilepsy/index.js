import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, Switch, FlatList, StyleSheet, ScrollView, Alert, RefreshControl } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { BASE_URL } from '../../config';

export default function Home() {
  const [batteryLevel, setBatteryLevel] = useState(0);
  const [alertOn, setAlertOn] = useState(true);
  const [activatedMates, setActivatedMates] = useState([]);
  const [watchStatus, setWatchStatus] = useState('ok');
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [supportUsers, setSupportUsers] = useState([]);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  
  // Add refs for debouncing
  const updateTimeoutRef = useRef(null);
  const lastUpdateRef = useRef(Date.now());

  // Memoize the processed mates list to prevent unnecessary re-renders
  const processedMates = useMemo(() => {
    return activatedMates.map(mate => ({
      ...mate,
      key: mate.email // Ensure stable keys for FlatList
    }));
  }, [activatedMates]);

  // Debounced update function
  const debouncedUpdateMates = useCallback((newMates) => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;

    if (timeSinceLastUpdate < 2000) { // Minimum 2 seconds between updates
      updateTimeoutRef.current = setTimeout(() => {
        setActivatedMates(newMates);
        lastUpdateRef.current = Date.now();
      }, 2000 - timeSinceLastUpdate);
    } else {
      setActivatedMates(newMates);
      lastUpdateRef.current = now;
    }
  }, []);

  // Deep comparison function
  const areMatesEqual = useCallback((mates1, mates2) => {
    if (!mates1 || !mates2) return false;
    if (mates1.length !== mates2.length) return false;
    return mates1.every((mate1, index) => {
      const mate2 = mates2[index];
      return mate1.email === mate2.email && 
             mate1.isAvailable === mate2.isAvailable &&
             mate1.firstName === mate2.firstName &&
             mate1.surname === mate2.surname;
    });
  }, []);

  // Debug function to check AsyncStorage contents
  const debugStorage = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      console.log('All AsyncStorage keys:', keys);
      
      for (const key of keys) {
        if (key.includes('activatedMates') || key.includes('alertOn')) {
          const value = await AsyncStorage.getItem(key);
          console.log(`${key}:`, value);
        }
      }
    } catch (e) {
      console.error('Debug storage error:', e);
    }
  };

  // Load user's email and alert preference from storage
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Get user email
        const email = await AsyncStorage.getItem('userEmail');
        if (email) {
          setUserEmail(email);
          
          // Load user-specific alert preference with fallbacks
          let foundPreference = false;
          
          // Try user-specific key first
          const storedAlertOn = await AsyncStorage.getItem(`alertOn_${email}`);
          if (storedAlertOn !== null) {
            setAlertOn(storedAlertOn === 'true');
            foundPreference = true;
            console.log(`Loaded alert preference for ${email}:`, storedAlertOn === 'true');
          }
          
          // Try general key if no user-specific preference found
          if (!foundPreference) {
            const generalAlertOn = await AsyncStorage.getItem('alertOn');
            if (generalAlertOn !== null) {
              setAlertOn(generalAlertOn === 'true');
              foundPreference = true;
              console.log('Loaded from general alert preference:', generalAlertOn === 'true');
              
              // Migrate to user-specific key
              await AsyncStorage.setItem(`alertOn_${email}`, generalAlertOn);
            }
          }
          
          // If no preference found at all, default to true but don't save yet
          if (!foundPreference) {
            console.log('No alert preference found, defaulting to true');
            setAlertOn(true);
          }

          // Debug to see what's in storage
          await debugStorage();
        }
      } catch (error) {
        console.warn('Error loading user data:', error);
      }
    };
    loadUserData();
  }, []);

  const loadSupportUsers = async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/support-users?timestamp=${Date.now()}`, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        if (response.ok) {
          const supportData = await response.json();
          if (Array.isArray(supportData)) {
          const processedUsers = supportData.map(user => ({
                ...user,
            isAvailable: user.isAvailable === true || user.isAvailable === 'true'
          }));
            
            setSupportUsers(processedUsers);
            await AsyncStorage.setItem('supportUsers', JSON.stringify(processedUsers));
            
            for (const user of processedUsers) {
              await AsyncStorage.setItem(`availability_${user.email}`, JSON.stringify(user.isAvailable));
            }
            
            return processedUsers;
          }
      }
      
      const storedSupportUsers = await AsyncStorage.getItem('supportUsers');
      if (storedSupportUsers) {
        const parsedUsers = JSON.parse(storedSupportUsers);
        setSupportUsers(parsedUsers);
        return parsedUsers;
      }
      
      return [];
    } catch (err) {
      return [];
    }
  };

  const loadMates = async () => {
    try {
      const email = await AsyncStorage.getItem('userEmail');
      if (!email) return;
      
      setIsLoading(true);
      
      // Always try persistent storage first
      const persistentTeamData = await AsyncStorage.getItem(`persistent_team_${email}`);
      if (persistentTeamData) {
        try {
          const parsedTeam = JSON.parse(persistentTeamData);
          if (parsedTeam.teamMembers && Array.isArray(parsedTeam.teamMembers)) {
            setActivatedMates(parsedTeam.teamMembers);
            setIsLoading(false);
        return;
          }
        } catch (e) {}
      }
      
      // If no persistent data, try server
      try {
        const response = await fetch(`${BASE_URL}/api/user/${encodeURIComponent(email)}/team`);
        if (response.ok) {
          const serverData = await response.json();
          if (serverData.teamMembers && Array.isArray(serverData.teamMembers)) {
            // Preserve existing team member data and only update availability
            let updatedTeamMembers;
            if (activatedMates.length > 0) {
              // Create a map of existing team members for quick lookup
              const existingMatesMap = new Map(
                activatedMates.map(mate => [mate.email, mate])
              );
              
              // Update only availability status from server data
              updatedTeamMembers = serverData.teamMembers.map(serverMember => {
                const existingMate = existingMatesMap.get(serverMember.email);
                if (existingMate) {
                  // Keep all existing data, just update availability
                  return {
                    ...existingMate,
                    isAvailable: serverMember.isAvailable
                  };
                }
                return serverMember;
              });
            } else {
              updatedTeamMembers = serverData.teamMembers;
            }
            
            const teamData = {
              epilepsyUser: {
                email,
                firstName: await AsyncStorage.getItem('userFirstName') || email.split('@')[0],
                surname: await AsyncStorage.getItem('userSurname') || ''
              },
              teamMembers: updatedTeamMembers
            };
            
            // Save to persistent storage
            await AsyncStorage.setItem(`persistent_team_${email}`, JSON.stringify(teamData));
            setActivatedMates(updatedTeamMembers);
            setIsLoading(false);
          return;
        }
      }
      } catch (e) {}

      // If still no data, try other storage locations as last resort
      const storageKeys = [
        `team_${email}`,
        `team_members_${email}`,
        `activatedMates_${email}`,
        'activatedMates'
      ];

      for (const key of storageKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          try {
            const parsed = JSON.parse(data);
            const teamMembers = Array.isArray(parsed) ? parsed : parsed.teamMembers;
            if (Array.isArray(teamMembers) && teamMembers.length > 0) {
              setActivatedMates(teamMembers);
              
              // Save to persistent storage for future
              const teamData = {
                epilepsyUser: {
                  email,
                  firstName: await AsyncStorage.getItem('userFirstName') || email.split('@')[0],
                  surname: await AsyncStorage.getItem('userSurname') || ''
                },
                teamMembers
              };
              await AsyncStorage.setItem(`persistent_team_${email}`, JSON.stringify(teamData));
              setIsLoading(false);
          return;
            }
          } catch (e) {}
        }
      }
      
      setActivatedMates([]);
    } catch (err) {
      console.error('Error in loadMates:', err);
      setActivatedMates([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const email = await AsyncStorage.getItem('userEmail');
        if (email) {
          setUserEmail(email);
          const supportUsersData = await loadSupportUsers();
          setSupportUsers(supportUsersData || []);
          await loadMates();
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
      setIsLoading(false);
      }
    };

    loadInitialData();
  }, []); // Run only once on mount

  // Modify useFocusEffect to be more conservative
  useFocusEffect(
    React.useCallback(() => {
      const now = Date.now();
      if (now - lastRefreshTime < 5000 || !userEmail || isLoading) {
        return;
      }
      setLastRefreshTime(now);

      let isMounted = true;
      const refreshData = async () => {
        try {
          // Only update support users' availability status
          const supportUsersData = await loadSupportUsers();
          if (!isMounted) return;
          
          if (supportUsersData && activatedMates.length > 0) {
            // Create a map of email to availability for quick lookup
            const availabilityMap = new Map(
              supportUsersData.map(user => [user.email, user.isAvailable])
            );
            
            // Only update if availability has actually changed
            const updatedMates = activatedMates.map(mate => {
              const newAvailability = availabilityMap.get(mate.email);
              if (newAvailability !== undefined && newAvailability !== mate.isAvailable) {
                return { ...mate, isAvailable: newAvailability };
              }
              return mate;
            });
            
            // Only update state if there are actual changes
            if (!areMatesEqual(activatedMates, updatedMates)) {
              setActivatedMates(updatedMates);
              
              // Update storage with new availability
              const teamData = {
                epilepsyUser: {
                  email: userEmail,
                  firstName: await AsyncStorage.getItem('userFirstName') || userEmail.split('@')[0],
                  surname: await AsyncStorage.getItem('userSurname') || ''
                },
                teamMembers: updatedMates
              };
              await AsyncStorage.setItem(`persistent_team_${userEmail}`, JSON.stringify(teamData));
            }
          }
        } catch (error) {}
      };
      
      refreshData();
      return () => {
        isMounted = false;
      };
    }, [userEmail, lastRefreshTime, isLoading, activatedMates, areMatesEqual])
  );
          
  // Memoize the FlatList data
  const matesList = useMemo(() => {
    return activatedMates.map(mate => ({
      ...mate,
      key: mate.email
    }));
  }, [activatedMates]);
            
  // Memoize the render item function
  const renderMateItem = useCallback(({ item }) => (
    <View style={[
      styles.mateItem,
      !item.isAvailable && styles.unavailableMate
    ]}>
      <Text style={styles.mateText}>{item.firstName} {item.surname}</Text>
      <Text style={[
        styles.availabilityText,
        item.isAvailable ? styles.availableText : styles.unavailableText
      ]}>
        {item.isAvailable ? '(Available)' : '(Unavailable)'}
      </Text>
    </View>
  ), []);
      
  // Modify the onRefresh handler to be more efficient
  const onRefresh = useCallback(async () => {
    if (refreshing) return; // Prevent multiple simultaneous refreshes
    
    setRefreshing(true);
    try {
      const supportUsersData = await loadSupportUsers();
      if (supportUsersData) {
        setSupportUsers(supportUsersData);
        await loadMates();
          }
    } catch (error) {
      console.warn('Error during refresh:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing]);

  const toggleAlert = async () => {
    if (!userEmail) return;
    
    // If turning off alerts, show a confirmation message
    if (alertOn) {
      Alert.alert(
        "Turn Off Alerts?",
        "When alerts are turned off, your mates will NOT be notified of any seizures detected. They will see you have alerts disabled.",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Turn Off",
            onPress: async () => {
              // User confirmed, turn off alerts
              setAlertOn(false);
              
              // Save preference to persist between sessions with multiple storage keys
              try {
                // Save to user-specific key
                await AsyncStorage.setItem(`alertOn_${userEmail}`, "false");
                // Also save to general key for backward compatibility
                await AsyncStorage.setItem('alertOn', "false");
                console.log(`Saved alert preference to multiple locations for ${userEmail}: false`);
                
                // Debug to confirm storage was updated
                await debugStorage();
              } catch (error) {
                console.warn('Error saving alert preference:', error);
              }
            },
            style: "destructive"
          }
        ]
      );
    } else {
      // Turning on alerts doesn't need confirmation
      setAlertOn(true);
      
      // Save preference to persist between sessions with multiple storage keys
      try {
        // Save to user-specific key
        await AsyncStorage.setItem(`alertOn_${userEmail}`, "true");
        // Also save to general key for backward compatibility
        await AsyncStorage.setItem('alertOn', "true");
        console.log(`Saved alert preference to multiple locations for ${userEmail}: true`);
        
        // Debug to confirm storage was updated
        await debugStorage();
      } catch (error) {
        console.warn('Error saving alert preference:', error);
      }
    }
  };

  const StatusSection = useCallback(() => (
        <View style={styles.statusContainer}>
          <View style={styles.statusIconWrapper}>
            {watchStatus === 'ok' ? (
              <View style={[styles.statusIcon, { backgroundColor: '#4CAF50' }]}>
                <Ionicons name="checkmark" size={50} color="white" />
              </View>
            ) : (
              <View style={[styles.statusIcon, { backgroundColor: '#F44336' }]}>
                <MaterialIcons name="close" size={50} color="white" />
              </View>
            )}
          </View>

          <Text style={styles.statusMessage}>
            {watchStatus === 'ok' ? 'EVERYTHING IS OKAY!' : 'SOMETHING IS WRONG!'}
          </Text>

          <Text style={styles.statusSubmessage}>
            {watchStatus === 'ok'
              ? 'Your watch and app is active'
              : 'Your watch is not working properly:'}
          </Text>

          {watchStatus === 'error' && (
            <View style={styles.errorSteps}>
              <Text style={styles.errorStep}>1. Check watch connection</Text>
              <Text style={styles.errorStep}>2. Check watch battery</Text>
              <Text style={styles.errorStep}>3. Restart watch</Text>
            </View>
          )}
        </View>
  ), [watchStatus]);

  const BatterySection = useCallback(() => (
        <View style={styles.centeredRow}>
          <Text style={styles.label}>Watch battery:</Text>
          <Text style={styles.value}>{batteryLevel}%</Text>
        </View>
  ), [batteryLevel]);

  const AlertSection = useCallback(() => (
        <View style={styles.alertRow}>
          <Text style={styles.label}>Alert mates:</Text>
          <Switch
            value={alertOn}
            onValueChange={toggleAlert}
            trackColor={{ false: '#767577', true: '#32BF55' }}
            thumbColor={alertOn ? '#ffffff' : '#f4f3f4'}
          />
        </View>
  ), [alertOn, toggleAlert]);

  const ListHeaderComponent = useCallback(() => (
    <>
      <StatusSection />
      <BatterySection />
      <AlertSection />
        <View style={styles.centeredContainer}>
          <Text style={styles.labels}>Activated mates:</Text>
      </View>
    </>
  ), [StatusSection, BatterySection, AlertSection]);

  const ListEmptyComponent = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Text style={styles.noMatesText}>No mates activated</Text>
    </View>
  ), []);

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your team...</Text>
        </View>
      ) : (
            <FlatList
          data={matesList}
          keyExtractor={item => item.key}
              renderItem={({ item }) => (
            <View style={styles.teamMemberRow}>
              <View style={styles.teamMemberContent}>
                <Text style={styles.teamMemberName}>
                  {item.firstName} {item.surname}
                </Text>
                <Text style={[
                  styles.availabilityStatus,
                  item.isAvailable ? styles.availableStatus : styles.unavailableStatus
                ]}>
                  {item.isAvailable ? 'Available' : 'Unavailable'}
                  </Text>
              </View>
                </View>
              )}
          ListHeaderComponent={ListHeaderComponent}
          ListEmptyComponent={ListEmptyComponent}
          contentContainerStyle={styles.listContentContainer}
          style={[styles.flatList, styles.teamMembersList]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#9747FF']}
              tintColor={'#9747FF'}
            />
          }
          showsVerticalScrollIndicator={false}
        />
          )}
        </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flatList: {
    flex: 1,
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContentContainer: {
    paddingTop: 80,
    paddingBottom: 20,
  },
  statusContainer: {
    alignItems: 'center',
    padding: 5,
    marginBottom: 10,
  },
  statusIconWrapper: {
    marginBottom: 40,
  },
  statusIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusMessage: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  statusSubmessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
  },
  errorSteps: {
    marginTop: 10,
  },
  errorStep: {
    fontSize: 14,
    marginBottom: 5,
    textAlign: 'center',
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 70,
    marginBottom: 90,
  },
  centeredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 25,
    paddingHorizontal: 70,
  },
  label: {
    fontSize: 16,
    color: '#000',
    marginRight: 8,
  },
  value: {
    fontSize: 18,
    color: '#000',
    textAlign: 'right',
  },
  centeredContainer: {
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 10,
    alignItems: 'center'
  },
  labels: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E3A59',
    marginBottom: 15,
    textAlign: 'center'
  },
  mateItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    marginHorizontal: 5,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  unavailableMate: {
    backgroundColor: '#F5F5F5',
    borderColor: '#CCCCCC',
    opacity: 0.8,
  },
  mateText: {
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  availabilityText: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  availableText: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  unavailableText: {
    color: '#757575',
    fontStyle: 'italic',
  },
  noMatesText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 10,
    textAlign: 'center',
    alignSelf: 'center',
    flex: 1,
    paddingTop: 20
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 10,
  },
  matesListContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    marginHorizontal: 20,
  },
  teamMemberRow: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    width: '100%',
    borderRadius: 8,
  },
  teamMemberContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  teamMemberName: {
    fontSize: 16,
    color: '#2E3A59',
    fontWeight: '500',
  },
  availabilityStatus: {
    fontSize: 12,
    marginLeft: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    color: '#FFFFFF',
  },
  availableStatus: {
    backgroundColor: '#4CAF50',
  },
  unavailableStatus: {
    backgroundColor: '#6B7280',
  },
  teamMembersList: {
    borderRadius: 8,
    overflow: 'hidden',
    marginHorizontal: 20,
    width: 'auto',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200
  },
});
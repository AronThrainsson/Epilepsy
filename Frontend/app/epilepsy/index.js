import React, { useState, useEffect } from 'react';
import { View, Text, Switch, FlatList, StyleSheet, ScrollView, Alert, RefreshControl } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { BASE_URL } from '../../config';

export default function Home() {
  const [batteryLevel, setBatteryLevel] = useState(0);
  const [alertOn, setAlertOn] = useState(true); // Default to true
  const [activatedMates, setActivatedMates] = useState([]);
  const [watchStatus, setWatchStatus] = useState('ok');
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [supportUsers, setSupportUsers] = useState([]);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

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
      console.log('Loading support users with current availability status');
      
      // Try to get fresh data with a timestamp to prevent caching
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
            console.log('Loaded support users from API with availability:', supportData);
            
            // Process each support user
            const processedUsers = supportData.map(user => {
              // Ensure isAvailable is a boolean
              const isAvailable = user.isAvailable === true || user.isAvailable === 'true';
              console.log(`Support user ${user.firstName}: API availability=${isAvailable}`);
              
              return {
                ...user,
                isAvailable: isAvailable
              };
            });
            
            // Update state with processed users
            setSupportUsers(processedUsers);
            
            // Store for future use
            await AsyncStorage.setItem('supportUsers', JSON.stringify(processedUsers));
            console.log('Updated support users with availability status');
            
            // Update availability in storage for each user
            for (const user of processedUsers) {
              await AsyncStorage.setItem(`availability_${user.email}`, JSON.stringify(user.isAvailable));
              console.log(`Stored availability for ${user.email}: ${user.isAvailable}`);
            }
            
            return processedUsers;
          }
        }
      } catch (err) {
        console.warn('Error fetching fresh support users:', err);
      }
      
      // If we couldn't get fresh data, try from storage
      const storedSupportUsers = await AsyncStorage.getItem('supportUsers');
      if (storedSupportUsers) {
        const parsedUsers = JSON.parse(storedSupportUsers);
        console.log('Loaded support users from storage:', parsedUsers.length);
        setSupportUsers(parsedUsers);
        return parsedUsers;
      }
      
      return [];
    } catch (err) {
      console.warn('Error in loadSupportUsers:', err);
      return [];
    }
  };

  const loadMates = async () => {
    try {
      const email = await AsyncStorage.getItem('userEmail');
      if (!email) {
        console.warn('No user email found');
        return;
      }
      
      console.log('Loading mates for:', email);
      setIsLoading(true);
      
      // First try to load from persistent storage
      const persistentTeamMembers = await AsyncStorage.getItem(`persistent_team_members_${email}`);
      if (persistentTeamMembers) {
        const parsedMembers = JSON.parse(persistentTeamMembers);
        console.log(`Loaded ${parsedMembers.length} team members from persistent storage`);
        setActivatedMates(parsedMembers);
        
        // Restore to regular storage
        await AsyncStorage.setItem(`team_members_${email}`, persistentTeamMembers);
        return;
      }
      
      // If no persistent data, try regular storage
      const teamMembers = await AsyncStorage.getItem(`team_members_${email}`);
      if (teamMembers) {
        const parsedMembers = JSON.parse(teamMembers);
        console.log(`Loaded ${parsedMembers.length} team members from regular storage`);
        setActivatedMates(parsedMembers);
        return;
      }
      
      // If no team members found, try loading from team data
          const teamData = await AsyncStorage.getItem(`team_${email}`);
          if (teamData) {
              const parsedTeam = JSON.parse(teamData);
        if (parsedTeam.teamMembers && Array.isArray(parsedTeam.teamMembers)) {
          console.log(`Loaded ${parsedTeam.teamMembers.length} team members from team data`);
          setActivatedMates(parsedTeam.teamMembers);
          
          // Save to team members storage for future use
          await AsyncStorage.setItem(`team_members_${email}`, JSON.stringify(parsedTeam.teamMembers));
          await AsyncStorage.setItem(`persistent_team_members_${email}`, JSON.stringify(parsedTeam.teamMembers));
          return;
        }
      }
      
      // If still no data found, try persistent team data
      const persistentTeamData = await AsyncStorage.getItem(`persistent_team_${email}`);
      if (persistentTeamData) {
        const parsedTeam = JSON.parse(persistentTeamData);
        if (parsedTeam.teamMembers && Array.isArray(parsedTeam.teamMembers)) {
          console.log(`Loaded ${parsedTeam.teamMembers.length} team members from persistent team data`);
          setActivatedMates(parsedTeam.teamMembers);
          
          // Save to team members storage for future use
          await AsyncStorage.setItem(`team_members_${email}`, JSON.stringify(parsedTeam.teamMembers));
          await AsyncStorage.setItem(`persistent_team_members_${email}`, JSON.stringify(parsedTeam.teamMembers));
          return;
        }
      }
      
      // If no data found anywhere, set empty array
      console.log('No team members found anywhere');
      setActivatedMates([]);
    } catch (err) {
      console.error('Error loading mates:', err);
      setActivatedMates([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setBatteryLevel(78);
      await loadSupportUsers();
      setIsLoading(false);
    };
    loadData();
  }, []);

  // Load mates when userEmail is available
  useEffect(() => {
    if (userEmail) {
      loadMates();
    }
  }, [userEmail]);

  // Force reload every time we come back to the home page
  useFocusEffect(
    React.useCallback(() => {
      // Prevent excessive reloading with a time-based throttle
      const now = Date.now();
      if (now - lastRefreshTime < 500) {
        console.log('Skipping reload - too soon since last refresh');
        return;
      }
      
      setLastRefreshTime(now);
      console.log('Home page focused, reloading all data');
      
      if (!userEmail) {
        // Try to load user email first if we don't have it
        AsyncStorage.getItem('userEmail').then(email => {
          if (email) {
            setUserEmail(email);
            console.log('Loaded user email:', email);
          }
        });
        return;
      }

      // CRITICAL: Check for availability backup data first
      const checkForAvailabilityBackups = async () => {
        try {
          const keys = await AsyncStorage.getAllKeys();
          const availabilityBackupKeys = keys.filter(key => 
            key.startsWith('availabilityBackup_') && key.includes(`_${userEmail}_`)
          );
          
          if (availabilityBackupKeys.length > 0) {
            console.log('Found availability backup keys:', availabilityBackupKeys);
            
            // Group by original key
            const backupsByOriginalKey = {};
            for (const backupKey of availabilityBackupKeys) {
              // Extract original key and timestamp
              const parts = backupKey.split('_');
              const timestamp = parts[parts.length - 1];
              const originalKey = backupKey.replace(`availabilityBackup_`, '').replace(`_${timestamp}`, '');
              
              if (!backupsByOriginalKey[originalKey]) {
                backupsByOriginalKey[originalKey] = [];
              }
              backupsByOriginalKey[originalKey].push({
                backupKey,
                timestamp: parseInt(timestamp)
              });
            }
            
            // Check if we need to restore any backups
            for (const originalKey of Object.keys(backupsByOriginalKey)) {
              // Sort backups by timestamp (most recent first)
              const backups = backupsByOriginalKey[originalKey].sort((a, b) => b.timestamp - a.timestamp);
              const mostRecentBackup = backups[0];
              
              // Check if the original key exists
              const originalData = await AsyncStorage.getItem(originalKey);
              if (!originalData) {
                console.log(`Original key ${originalKey} not found, restoring from backup`);
                
                // Restore from backup
                const backupData = await AsyncStorage.getItem(mostRecentBackup.backupKey);
                if (backupData) {
                  await AsyncStorage.setItem(originalKey, backupData);
                  console.log(`Restored ${originalKey} from backup`);
                }
              }
            }
            
            // Clean up old backups
            const keysToRemove = availabilityBackupKeys;
            await AsyncStorage.multiRemove(keysToRemove);
            console.log('Cleaned up availability backups');
          }
        } catch (e) {
          console.warn('Error checking availability backups:', e);
        }
      };
      
      // Check for backups before loading data
      checkForAvailabilityBackups().then(() => {
        // First refresh support users to get updated availability
        loadSupportUsers().then(() => {
          console.log('Support users loaded, waiting for a moment before loading mates...');
          
          // Debug current mates before loading
          console.log('Current activated mates before reload:', activatedMates);
          
          // ENHANCED: Implement a more robust loading strategy with multiple attempts
          // This helps ensure data is loaded properly after login
          const attemptLoadWithRetries = async (attempt = 1, maxAttempts = 3) => {
            console.log(`Attempt ${attempt}/${maxAttempts} to load mates data`);
            
            // Longer delay for each subsequent attempt
            const delay = 500 * attempt;
            await new Promise(resolve => setTimeout(resolve, delay));
            
            const success = await loadMates();
            
            if (success) {
              console.log(`Successfully loaded mates on attempt ${attempt}, found ${activatedMates.length} mates`);
              return true;
            } else if (attempt < maxAttempts) {
              console.log(`Failed to load mates on attempt ${attempt}, will retry...`);
              return attemptLoadWithRetries(attempt + 1, maxAttempts);
            } else {
              console.warn(`Failed to load mates after ${maxAttempts} attempts`);
              return false;
            }
          };
          
          // Start the loading process with retries
          attemptLoadWithRetries();
        });
      });
      
      // When home page is focused, also check for any stored 
      // user-specific team selections and log them for debugging
      const debugUserTeams = async () => {
        try {
          const email = await AsyncStorage.getItem('userEmail');
          if (!email) return;
          
          console.log('Debugging user team data for:', email);
          const keys = await AsyncStorage.getAllKeys();
          const userKeys = keys.filter(k => 
            k.includes(`_${email}`) || 
            k.includes('team_') || 
            k.includes('activatedMates') || 
            k.includes('persistentTeam') ||
            k.includes('logoutBackup') ||
            k.includes('availabilityBackup')
          );
          
          console.log('User-related keys:', userKeys);
          
          // Check the most important keys
          const priorityKeys = [
            `formatted_mates_${email}`,
            `team_${email}`,
            `user_${email}_team`,
            `activatedMatesEmails_${email}`,
            `activatedMates_${email}`,
            `persistentTeam_${email}`
          ];
          
          for (const key of priorityKeys) {
            const value = await AsyncStorage.getItem(key);
            console.log(`[Home Debug] ${key}:`, value);
          }
          
          // Also check for logout backups
          const logoutBackupKeys = keys.filter(key => key.startsWith(`logoutBackup_${email}_`));
          if (logoutBackupKeys.length > 0) {
            console.log('Found logout backup keys:', logoutBackupKeys);
          }
        } catch (e) {
          console.error('Error debugging user teams:', e);
        }
      };
      
      debugUserTeams();
      
    }, [userEmail, lastRefreshTime, activatedMates]) // Add activatedMates to dependency array to track changes
  );

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

  // Add a function to handle manual refresh
  const onRefresh = async () => {
    console.log('Manual refresh triggered');
    setRefreshing(true);
    
    try {
      // First refresh support users to get updated availability
      await loadSupportUsers();
      
      // Then load mates with the updated availability
      await loadMates();
      
      console.log('Manual refresh completed');
    } catch (e) {
      console.error('Error during manual refresh:', e);
    } finally {
      setRefreshing(false);
    }
  };

  // Add a periodic refresh mechanism to automatically update data
  useEffect(() => {
    if (!userEmail) return;
    
    console.log('Setting up periodic refresh for availability status');
    
    // Set up interval to refresh data every 5 seconds
    const refreshInterval = setInterval(async () => {
      console.log('Periodic refresh triggered');
      
      // Only refresh support users to get latest availability
      try {
        const updatedSupportUsers = await loadSupportUsers();
        
        // If we have activated mates, update their availability status
        if (activatedMates.length > 0 && updatedSupportUsers && updatedSupportUsers.length > 0) {
          const updatedMates = activatedMates.map(mate => {
            // Find this support user in the updated list
            const supportUser = updatedSupportUsers.find(user => user.email === mate.email);
            
            if (supportUser) {
              // Update availability from the fresh data
              return {
                ...mate,
                isAvailable: supportUser.isAvailable
              };
            }
            return mate;
          });
          
          // Only update state if availability actually changed
          const availabilityChanged = updatedMates.some((mate, index) => 
            mate.isAvailable !== activatedMates[index].isAvailable
          );
          
          if (availabilityChanged) {
            console.log('Availability status changed, updating UI');
            setActivatedMates(updatedMates);
            
            // Also update storage
            const matesJson = JSON.stringify(updatedMates);
            await AsyncStorage.setItem(`formatted_mates_${userEmail}`, matesJson);
            await AsyncStorage.setItem(`activatedMates_${userEmail}`, matesJson);
          }
        }
      } catch (e) {
        console.warn('Error in periodic refresh:', e);
      }
    }, 5000); // Check every 5 seconds
    
    // Clean up interval on unmount
    return () => clearInterval(refreshInterval);
  }, [userEmail, activatedMates]);

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#9747FF']}
          tintColor={'#9747FF'}
        />
      }
    >
      <View style={styles.container}>
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

        <View style={styles.centeredRow}>
          <Text style={styles.label}>Watch battery:</Text>
          <Text style={styles.value}>{batteryLevel}%</Text>
        </View>

        <View style={styles.alertRow}>
          <Text style={styles.label}>Alert mates:</Text>
          <Switch
            value={alertOn}
            onValueChange={toggleAlert}
            trackColor={{ false: '#767577', true: '#32BF55' }}
            thumbColor={alertOn ? '#ffffff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.centeredContainer}>
          <Text style={styles.labels}>Activated mates:</Text>
          {activatedMates.length > 0 ? (
            <FlatList
              data={activatedMates}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, index) => item.email || index.toString()}
              renderItem={({ item }) => (
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
              )}
              contentContainerStyle={styles.centeredMatesList}
            />
          ) : (
            <Text style={styles.noMatesText}>No mates activated</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  container: {
    flex: 1,
    paddingTop: 80,
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
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  labels: {
    fontSize: 13,
    color: '#000',
    marginRight: 8,
    marginBottom: 20,
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
    color: '#757575',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },
  centeredMatesList: {
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
});
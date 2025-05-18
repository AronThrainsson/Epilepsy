import React, { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import { View, Text, Switch, FlatList, StyleSheet, Alert, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { BASE_URL } from '../../config';

// Simple debounce function to prevent excessive API calls
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
};

export default function Home() {
  const [isAvailable, setIsAvailable] = useState(true);
  const [team, setTeam] = useState(null);
  const [allTeams, setAllTeams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  
  // Track if we're currently fetching to prevent duplicate fetches
  const isFetchingRef = useRef(false);
  // Last fetch timestamp to prevent too frequent fetches
  const lastFetchTimeRef = useRef(0);

  // Create a ref to track first focus
  const isFirstFocusRef = useRef(true);

  // Add a ref to track if we've loaded initial data
  const hasLoadedInitialData = useRef(false);
  
  // Debounce the fetch team function with a longer delay
  const debouncedFetchTeam = useMemo(
    () => debounce(fetchTeam, 2000, { leading: true, trailing: false }),
    [fetchTeam]
  );

  useEffect(() => {
    // Get and store user email on component mount
    const getUserEmail = async () => {
      const email = await AsyncStorage.getItem('userEmail');
      if (email) {
        setUserEmail(email);
        
        // Also load availability based on this email
        try {
          let availabilityLoaded = false;
          
          // First try fetching from server to ensure we have the most up-to-date value
          try {
            const availabilityResponse = await fetch(`${BASE_URL}/api/user/${encodeURIComponent(email)}/availability?timestamp=${Date.now()}`);
            if (availabilityResponse.ok) {
              const availabilityData = await availabilityResponse.json();
              console.log('Initial load: Availability data from API:', availabilityData);
              
              // Set the state from server and update storage to match
              setIsAvailable(availabilityData.isAvailable);
              await AsyncStorage.setItem(`availability_${email}`, JSON.stringify(availabilityData.isAvailable));
              await AsyncStorage.setItem('availability', JSON.stringify(availabilityData.isAvailable));
              console.log(`Initial load: Updated availability for ${email} from server:`, availabilityData.isAvailable);
              availabilityLoaded = true;
            }
          } catch (apiErr) {
            console.warn('Error fetching availability from API on initial load:', apiErr);
            // Continue to try loading from storage as fallback
          }
          
          // If server fetch failed, try user-specific availability key
          if (!availabilityLoaded) {
            const savedAvailability = await AsyncStorage.getItem(`availability_${email}`);
            if (savedAvailability !== null) {
              console.log(`Initial load: Using stored availability for ${email}:`, savedAvailability);
              setIsAvailable(JSON.parse(savedAvailability));
              availabilityLoaded = true;
            } else {
              // Try general availability setting as fallback
              const generalAvailability = await AsyncStorage.getItem('availability');
              if (generalAvailability !== null) {
                console.log('Initial load: Using general availability:', generalAvailability);
                setIsAvailable(JSON.parse(generalAvailability));
                availabilityLoaded = true;
                // Migrate to user-specific key
                await AsyncStorage.setItem(`availability_${email}`, generalAvailability);
              }
            }
          }
          
          // Default to true for support users if nothing found (ensures better UX for new users)
          if (!availabilityLoaded) {
            console.log('No availability setting found, defaulting to TRUE for support user');
            setIsAvailable(true);
            // Save the default to storage
            await AsyncStorage.setItem(`availability_${email}`, 'true');
            await AsyncStorage.setItem('availability', 'true');
            // Also update the server with this default value
            try {
              await fetch(`${BASE_URL}/api/user/${encodeURIComponent(email)}/availability`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isAvailable: true })
              });
              console.log('Updated server with default availability: true');
            } catch (e) {
              console.warn('Failed to update server with default availability');
            }
          }
          
        } catch (e) {
          console.warn('Error loading user-specific availability:', e);
          // Set a safe default and ensure UI renders
          setIsAvailable(true);
        } finally {
          // Always mark as complete so UI can render
          setInitialLoadComplete(true);
        }
      } else {
        setInitialLoadComplete(true); // Ensure UI renders even if no email
      }
    };
    getUserEmail();
  }, []);

  // Function to load saved availability
  const loadSavedAvailability = useCallback(async () => {
    if (!userEmail) return;
    
    try {
      // First try user-specific key
      const savedAvailability = await AsyncStorage.getItem(`availability_${userEmail}`);
      if (savedAvailability !== null) {
        const parsedAvailability = JSON.parse(savedAvailability);
        console.log(`Loaded saved availability for ${userEmail}:`, parsedAvailability);
        if (isAvailable !== parsedAvailability) {
          console.log(`Restoring saved availability state for ${userEmail}:`, parsedAvailability);
          setIsAvailable(parsedAvailability);
        }
      } else {
        // Try general key if user-specific not found
        const generalAvailability = await AsyncStorage.getItem('availability');
        if (generalAvailability !== null) {
          const parsedGeneral = JSON.parse(generalAvailability);
          console.log(`Loaded general availability:`, parsedGeneral);
          if (isAvailable !== parsedGeneral) {
            console.log(`Restoring from general availability:`, parsedGeneral);
            setIsAvailable(parsedGeneral);
            // Migrate to user-specific key
            await AsyncStorage.setItem(`availability_${userEmail}`, generalAvailability);
          }
        }
      }
      
      // Also fetch from API to ensure we're in sync
      try {
        const availabilityResponse = await fetch(`${BASE_URL}/api/user/${encodeURIComponent(userEmail)}/availability?timestamp=${Date.now()}`);
        if (availabilityResponse.ok) {
          const availabilityData = await availabilityResponse.json();
          console.log('Got availability from API:', availabilityData);
          
          // Update if different from current state
          if (isAvailable !== availabilityData.isAvailable) {
            console.log(`Syncing availability from API:`, availabilityData.isAvailable);
            setIsAvailable(availabilityData.isAvailable);
            await AsyncStorage.setItem(`availability_${userEmail}`, JSON.stringify(availabilityData.isAvailable));
            await AsyncStorage.setItem('availability', JSON.stringify(availabilityData.isAvailable));
          }
        }
      } catch (apiErr) {
        console.warn('Error checking availability from API:', apiErr);
      }
    } catch (e) {
      console.warn('Error loading availability state:', e);
    }
  }, [userEmail, isAvailable]);

  // Define fetchTeam first, without dependencies on debouncedFetchTeam
  const fetchTeam = useCallback(async () => {
    try {
        const email = await AsyncStorage.getItem('userEmail');
      if (!email) return;

      setIsLoading(true);
      
      // Try persistent storage first
      const persistentTeamsData = await AsyncStorage.getItem(`persistent_all_teams_${email}`);
      if (persistentTeamsData) {
        const parsedTeams = JSON.parse(persistentTeamsData);
        setAllTeams(parsedTeams);
        
        // If we have teams, load the first one as current team
        if (parsedTeams.length > 0) {
          const firstTeam = parsedTeams[0];
          const teamData = await AsyncStorage.getItem(`persistent_team_${email}_${firstTeam.email}`);
          if (teamData) {
            const parsedTeam = JSON.parse(teamData);
            if (parsedTeam.teamMembers) {
              try {
                const availabilityResponse = await fetch(`${BASE_URL}/api/support-users?timestamp=${Date.now()}`);
                if (availabilityResponse.ok) {
                  const supportUsersData = await availabilityResponse.json();
                  const availabilityMap = new Map(
                    supportUsersData.map(user => [user.email, user.isAvailable])
                  );
                  
                  const updatedMembers = parsedTeam.teamMembers.map(member => {
                    if (member.email === email) {
                      return { ...member, isAvailable };
                    }
                    return {
                      ...member,
                      isAvailable: availabilityMap.get(member.email) ?? member.isAvailable
                    };
                  });
                  
                  setTeam({ ...parsedTeam, teamMembers: updatedMembers });
                } else {
                  const updatedMembers = parsedTeam.teamMembers.map(member => {
                    if (member.email === email) {
                      return { ...member, isAvailable };
                    }
                    return member;
                  });
                  setTeam({ ...parsedTeam, teamMembers: updatedMembers });
                }
              } catch {
                const updatedMembers = parsedTeam.teamMembers.map(member => {
                  if (member.email === email) {
                    return { ...member, isAvailable };
                  }
                  return member;
                });
                setTeam({ ...parsedTeam, teamMembers: updatedMembers });
              }
            } else {
              setTeam(parsedTeam);
            }
          }
        }
        return;
      }
      
      // If no persistent data, try regular storage
      const teamsData = await AsyncStorage.getItem(`all_teams_${email}`);
      if (teamsData) {
        const parsedTeams = JSON.parse(teamsData);
        setAllTeams(parsedTeams);
        
        if (parsedTeams.length > 0) {
          const firstTeam = parsedTeams[0];
          const teamData = await AsyncStorage.getItem(`team_${email}_${firstTeam.email}`);
          if (teamData) {
            const parsedTeam = JSON.parse(teamData);
            if (parsedTeam.teamMembers) {
              try {
                const availabilityResponse = await fetch(`${BASE_URL}/api/support-users?timestamp=${Date.now()}`);
                if (availabilityResponse.ok) {
                  const supportUsersData = await availabilityResponse.json();
                  const availabilityMap = new Map(
                    supportUsersData.map(user => [user.email, user.isAvailable])
                  );
                  
                  const updatedMembers = parsedTeam.teamMembers.map(member => {
                    if (member.email === email) {
                      return { ...member, isAvailable };
                    }
                    return {
                      ...member,
                      isAvailable: availabilityMap.get(member.email) ?? member.isAvailable
                    };
                  });
                  
                  setTeam({ ...parsedTeam, teamMembers: updatedMembers });
          } else {
                  const updatedMembers = parsedTeam.teamMembers.map(member => {
                    if (member.email === email) {
                      return { ...member, isAvailable };
                    }
                    return member;
                  });
                  setTeam({ ...parsedTeam, teamMembers: updatedMembers });
                }
              } catch {
                const updatedMembers = parsedTeam.teamMembers.map(member => {
                  if (member.email === email) {
                    return { ...member, isAvailable };
              }
              return member;
            });
                setTeam({ ...parsedTeam, teamMembers: updatedMembers });
              }
            } else {
              setTeam(parsedTeam);
            }
          }
        }
      }

      // If no data in storage, try loading from server
      try {
        const response = await fetch(`${BASE_URL}/api/support-user/${encodeURIComponent(email)}/teams`);
        if (response.ok) {
          const serverTeams = await response.json();
          if (Array.isArray(serverTeams) && serverTeams.length > 0) {
            setAllTeams(serverTeams);
            
            // Load first team's details
            const firstTeam = serverTeams[0];
            const teamResponse = await fetch(`${BASE_URL}/api/user/${encodeURIComponent(firstTeam.email)}/team`);
            if (teamResponse.ok) {
              const teamData = await teamResponse.json();
              if (teamData.teamMembers) {
                const availabilityResponse = await fetch(`${BASE_URL}/api/support-users?timestamp=${Date.now()}`);
                if (availabilityResponse.ok) {
                  const supportUsersData = await availabilityResponse.json();
                  const availabilityMap = new Map(
                    supportUsersData.map(user => [user.email, user.isAvailable])
                  );
                  
                  const updatedMembers = teamData.teamMembers.map(member => {
                    if (member.email === email) {
                      return { ...member, isAvailable };
                    }
                      return {
                        ...member,
                      isAvailable: availabilityMap.get(member.email) ?? member.isAvailable
                    };
                  });
                  
                  const fullTeamData = {
                    epilepsyUser: firstTeam,
                    teamMembers: updatedMembers
                  };
                  
                  setTeam(fullTeamData);
                  
                  // Save to storage for future
                  await AsyncStorage.setItem(`persistent_all_teams_${email}`, JSON.stringify(serverTeams));
                  await AsyncStorage.setItem(`persistent_team_${email}_${firstTeam.email}`, JSON.stringify(fullTeamData));
                }
              }
            }
          }
        }
      } catch {}
    } catch (err) {
      setAllTeams([]);
      setTeam(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable]);

  // Modify useFocusEffect to be more conservative
  useFocusEffect(
    useCallback(() => {
      if (!userEmail) return;

      // Only fetch on first focus
      if (!hasLoadedInitialData.current) {
        hasLoadedInitialData.current = true;
        fetchTeam();
      }
      
      return () => {
        // No need for cleanup here since we're not using intervals or timeouts
      };
    }, [userEmail, fetchTeam])
  );

  // Remove the periodic refresh interval and replace with a more efficient update mechanism
  useEffect(() => {
    if (!userEmail || !team || isLoading) return;

    let isMounted = true;
    const checkAvailability = async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/user/${encodeURIComponent(userEmail)}/availability?timestamp=${Date.now()}`);
        if (!isMounted) return;

        if (response.ok) {
          const data = await response.json();
          if (data.isAvailable !== isAvailable) {
            setIsAvailable(data.isAvailable);
            
            // Update local storage
            await AsyncStorage.setItem(`availability_${userEmail}`, JSON.stringify(data.isAvailable));
            
            // Only update team if availability actually changed
            if (team.teamMembers) {
              const updatedMembers = team.teamMembers.map(member => {
                if (member.email === userEmail) {
                  return { ...member, isAvailable: data.isAvailable };
                }
                return member;
              });
              
              const updatedTeam = { ...team, teamMembers: updatedMembers };
              setTeam(updatedTeam);
              await AsyncStorage.setItem(`team_${userEmail}`, JSON.stringify(updatedTeam));
            }
          }
        }
      } catch (e) {}
    };

    // Check availability every 30 seconds instead of 15
    const interval = setInterval(checkAvailability, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [userEmail, team, isAvailable, isLoading]);

  // Optimize the team switching function
  const switchTeam = useCallback(async (epilepsyUserEmail) => {
    if (isLoading || !userEmail || team?.epilepsyUser?.email === epilepsyUserEmail) return;
    
    setIsLoading(true);
    try {
      // Try local storage first
      const storedTeamData = await AsyncStorage.getItem(`team_${userEmail}_${epilepsyUserEmail}`);
      if (storedTeamData) {
        const parsedTeamData = JSON.parse(storedTeamData);
        setTeam(parsedTeamData);
        setIsLoading(false);
        
        // Update in background
        debouncedFetchTeam();
        return;
      }
      
      // If not in storage, fetch from server
        const teamResponse = await fetch(`${BASE_URL}/api/user/${encodeURIComponent(epilepsyUserEmail)}/team?timestamp=${Date.now()}`);
        if (!teamResponse.ok) {
          setIsLoading(false);
          return;
        }
        
        const teamData = await teamResponse.json();
      const epilepsyUser = allTeams.find(t => t.email === epilepsyUserEmail);
        
      teamData.epilepsyUser = epilepsyUser ? {
          firstName: epilepsyUser.firstName,
          surname: epilepsyUser.surname,
          email: epilepsyUser.email
      } : {
        firstName: epilepsyUserEmail.split('@')[0],
        surname: '',
        email: epilepsyUserEmail
      };

      // Update with current user's availability
        if (teamData.teamMembers) {
            teamData.teamMembers = teamData.teamMembers.map(member => {
              if (member.email === userEmail) {
            return { ...member, isAvailable };
              }
              return member;
            });
        }
        
        setTeam(teamData);
      await AsyncStorage.setItem(`team_${userEmail}_${epilepsyUserEmail}`, JSON.stringify(teamData));
        } catch (e) {
    } finally {
      setIsLoading(false);
    }
  }, [userEmail, isAvailable, allTeams, isLoading, team, debouncedFetchTeam]);

  // Memoize the team selector items
  const TeamSelectorItem = memo(({ teamItem }) => (
    <TouchableOpacity
      key={teamItem.email}
      style={[
        styles.teamSelectorItem,
        team?.epilepsyUser?.email === teamItem.email && styles.teamSelectorItemActive
      ]}
      onPress={() => switchTeam(teamItem.email)}
    >
      <Text 
        style={[
          styles.teamSelectorText,
          team?.epilepsyUser?.email === teamItem.email && styles.teamSelectorTextActive
        ]}
      >
        {teamItem.firstName} {teamItem.surname}
      </Text>
    </TouchableOpacity>
  ));

  // Memoize the team member items
  const TeamMemberItem = memo(({ member }) => (
    <View 
      style={styles.teamMemberRow}
    >
      <View style={styles.teamMemberContent}>
        <Text style={[
          styles.teamMemberName,
          member.email === userEmail && styles.currentUserText
        ]}>
          {member.firstName} {member.surname}
          {member.email === userEmail && ' (You)'}
        </Text>
        <Text style={[
          styles.availabilityStatus,
          member.isAvailable ? styles.availableStatus : styles.unavailableStatus
        ]}>
          {member.isAvailable ? 'Available' : 'Unavailable'}
        </Text>
      </View>
    </View>
  ));

  // Add function to handle manual refresh
  const onRefresh = useCallback(async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    try {
      await fetchTeam();
      await loadSavedAvailability();
    } catch (error) {
      console.warn('Error during refresh:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, fetchTeam, loadSavedAvailability]);

  // Add toggleAvailability function
  const toggleAvailability = useCallback(async () => {
    if (!userEmail) return;

    try {
      if (isAvailable) {
        // Show confirmation when switching to unavailable
        Alert.alert(
          "Pause Alerts?",
          "Important: You won't receive seizure alerts while unavailable. Ensure another caregiver is covering this time.",
          [
            { text: "Stay Available", style: 'cancel' },
            {
              text: "Go Unavailable",
              style: 'destructive',
              onPress: async () => {
                setIsAvailable(false);
                await updateAvailabilityStatus(false);
              },
            },
          ]
        );
      } else {
        // No confirmation needed when switching to available
        setIsAvailable(true);
        await updateAvailabilityStatus(true);
      }
    } catch (error) {
      console.warn('Error toggling availability:', error);
      Alert.alert('Error', 'Failed to update availability status');
    }
  }, [userEmail, isAvailable]);

  // Add helper function to update availability status
  const updateAvailabilityStatus = async (newStatus) => {
    try {
      await AsyncStorage.setItem(`availability_${userEmail}`, JSON.stringify(newStatus));
      
      const response = await fetch(`${BASE_URL}/api/user/${encodeURIComponent(userEmail)}/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: newStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update server');
      }

      if (team?.teamMembers) {
        const updatedMembers = team.teamMembers.map(member => {
          if (member.email === userEmail) {
            return { ...member, isAvailable: newStatus };
          }
          return member;
        });

        setTeam(prevTeam => ({
          ...prevTeam,
          teamMembers: updatedMembers
        }));
      }
    } catch (error) {
      setIsAvailable(!newStatus);
      throw error;
    }
  };

  return (
    <ScrollView 
      style={styles.scrollContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#9747FF']}
          tintColor={'#9747FF'}
        />
      }
    >
      {initialLoadComplete ? (
        <View style={styles.container}>
          <View style={styles.statusContainer}>
            <View style={styles.statusIconWrapper}>
              <View
                style={[
                  styles.statusIcon,
                  { backgroundColor: isAvailable ? '#4CAF50' : '#6B7280' },
                ]}
              >
                {isAvailable ? (
                  <Ionicons name="checkmark" size={50} color="white" />
                ) : (
                  <MaterialIcons name="notifications-off" size={40} color="white" />
                )}
              </View>
            </View>

            <Text style={styles.statusMessage}>
              {isAvailable ? 'You are available' : 'You are unavailable'}
            </Text>

            <View style={styles.centeredRow}>
              <Text style={styles.label}>Available for alerts</Text>
              <Switch
                value={isAvailable}
                onValueChange={toggleAvailability}
                trackColor={{ false: '#767577', true: '#32BF55' }}
                thumbColor={isAvailable ? '#ffffff' : '#f4f3f4'}
              />
            </View>
          </View>

          <View style={styles.centeredContainer}>
            {isLoading ? (
              <Text style={styles.loadingText}>Loading your team...</Text>
            ) : team && team.epilepsyUser ? (
              <>
                {/* Team Selector - shows only if multiple teams */}
                {allTeams && allTeams.length > 1 && (
                  <View style={styles.teamSelectorContainer}>
                    <Text style={styles.teamSelectorLabel}>Your Teams:</Text>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      style={styles.teamSelectorScroll}
                      contentContainerStyle={styles.teamSelectorContent}
                    >
                      {allTeams.map((teamItem) => (
                        <TeamSelectorItem 
                          key={teamItem.email}
                          teamItem={teamItem}
                        />
                      ))}
                    </ScrollView>
                  </View>
                )}

                <Text style={styles.teamDetailsHeader}>
                  {team.epilepsyUser.firstName}{team.epilepsyUser.surname ? ` ${team.epilepsyUser.surname}` : ''}'s mates:
                </Text>
                
                {/* Show alert status for epilepsy user */}
                {team.epilepsyUser?.alertsEnabled !== undefined && (
                  <View style={styles.alertStatusContainer}>
                    <Text style={styles.alertStatusText}>
                      <MaterialIcons 
                        name={team.epilepsyUser.alertsEnabled ? "notifications-active" : "notifications-off"} 
                        size={18} 
                        color={team.epilepsyUser.alertsEnabled ? "#4CAF50" : "#F44336"} 
                      /> {team.epilepsyUser.alertsEnabled 
                          ? "Seizure alerts are enabled" 
                          : "Seizure alerts are disabled"}
                    </Text>
                    {!team.epilepsyUser.alertsEnabled && (
                      <Text style={styles.alertWarningText}>
                        You will not receive notifications for seizures while alerts are disabled.
                      </Text>
                    )}
                  </View>
                )}

                <View style={styles.teamMembersList}>
                  {team.teamMembers.map((member) => (
                    <TeamMemberItem 
                      key={member.email || `team-member-${Math.random()}`}
                      member={member}
                    />
                  ))}
                </View>
              </>
            ) : (
              <View style={styles.noTeamsContainer}>
                <MaterialIcons name="group-off" size={60} color="#9747FF" style={styles.noTeamsIcon} />
                <Text style={styles.noTeamsText}>You are not part of any teams yet</Text>
                <Text style={styles.noTeamsSubtext}>
                  When an epilepsy user adds you to their team, it will appear here.
                </Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your settings...</Text>
        </View>
      )}
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
    paddingTop: 70,
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
  centeredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 70,
    paddingHorizontal: 70,
  },
  label: {
    fontSize: 16,
    color: '#000',
    marginRight: 8,
  },
  centeredContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  labels: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 20,
  },
  teamDetailsHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E3A59',
    marginTop: 30,
    marginBottom: 15,
  },
  teamMemberRow: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    width: '100%',
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
  },
  noTeamsText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 200,
  },
  noTeamsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginTop: 20,
  },
  noTeamsIcon: {
    marginBottom: 15,
  },
  noTeamsSubtext: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  currentUserText: {
    color: '#9747FF',
    fontWeight: '600',
  },
  teamMembersList: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
  },
  availableStatus: {
    color: '#FFFFFF',
    backgroundColor: '#4CAF50',
  },
  unavailableStatus: {
    color: '#FFFFFF',
    backgroundColor: '#6B7280',
  },
  teamSelectorContainer: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  teamSelectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E3A59',
    marginBottom: 10,
    paddingLeft: 5,
  },
  teamSelectorScroll: {
    width: '100%',
  },
  teamSelectorContent: {
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
  teamSelectorItem: {
    padding: 12,
    paddingHorizontal: 15,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: '#F9F0FF',
  },
  teamSelectorItemActive: {
    borderColor: '#CB97F0',
    backgroundColor: '#EFE6FF',
  },
  teamSelectorText: {
    fontSize: 16,
    color: '#2E3A59',
    fontWeight: '500',
  },
  teamSelectorTextActive: {
    color: '#9747FF',
    fontWeight: '600',
  },
  alertStatusContainer: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  alertStatusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E3A59',
    marginBottom: 5,
  },
  alertWarningText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
});
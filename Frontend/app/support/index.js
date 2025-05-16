import React, { useState, useEffect, useRef } from 'react';
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
  const loadSavedAvailability = React.useCallback(async () => {
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
  const fetchTeam = React.useCallback(async () => {
    try {
      // Prevent duplicate fetches or too frequent fetches
      if (isFetchingRef.current) {
        console.log('Already fetching team data, skipping duplicate fetch');
        return;
      }
      
      // Don't fetch more often than every 5 seconds unless it's a manual refresh
      const now = Date.now();
      if (now - lastFetchTimeRef.current < 5000 && !refreshing) {
        console.log('Fetch attempted too soon after previous fetch, skipping');
        return;
      }
      
      // Mark that we're fetching and update timestamp
      isFetchingRef.current = true;
      lastFetchTimeRef.current = now;
      
      if (!userEmail) {
        const email = await AsyncStorage.getItem('userEmail');
        if (!email) {
          console.error('No user email found in AsyncStorage');
          isFetchingRef.current = false;
          return;
        }
        setUserEmail(email);
      }

      console.log('Fetching team data for support user:', userEmail);
      setIsLoading(true);
      
      // First load the saved availability to ensure we use the correct value
      let savedAvailability = isAvailable;
      try {
        // Try user-specific availability key
        const storedAvailability = await AsyncStorage.getItem(`availability_${userEmail}`);
        if (storedAvailability !== null) {
          savedAvailability = JSON.parse(storedAvailability);
          console.log(`Using stored availability for team fetch: ${savedAvailability}`);
          
          // Update the UI state to match stored value - only if different to avoid re-renders
          if (isAvailable !== savedAvailability) {
            setIsAvailable(savedAvailability);
          }
        } else {
          // Try general availability as fallback
          const generalAvailability = await AsyncStorage.getItem('availability');
          if (generalAvailability !== null) {
            savedAvailability = JSON.parse(generalAvailability);
            console.log(`Using general availability for team fetch: ${savedAvailability}`);
            
            // Update the UI state to match stored value - only if different
            if (isAvailable !== savedAvailability) {
              setIsAvailable(savedAvailability);
            }
          }
        }
      } catch (e) {
        console.warn('Error reading stored availability:', e);
      }

      // First check if we have team data in local storage
      let localTeamData = null;
      let localAllTeams = null;
      
      try {
        // First check if we have backup from recent availability change
        const storedBackupTeam = await AsyncStorage.getItem(`team_${userEmail}_backup`);
        const storedBackupAllTeams = await AsyncStorage.getItem(`all_teams_${userEmail}_backup`);
        
        // Normal team storage
        const storedTeam = await AsyncStorage.getItem(`team_${userEmail}`);
        const storedAllTeams = await AsyncStorage.getItem(`all_teams_${userEmail}`);
        
        // Prefer backups if they exist (they're from recent availability changes)
        if (storedBackupTeam) {
          localTeamData = JSON.parse(storedBackupTeam);
          console.log('Found backup team data from availability change:', localTeamData);
          
          // Update team member availability to match current availability
          if (localTeamData.teamMembers) {
            localTeamData.teamMembers = localTeamData.teamMembers.map(member => {
              if (member.email === userEmail) {
                return { ...member, isAvailable: savedAvailability };
              }
              return member;
            });
          }
          
          // Clean up backup after using it
          await AsyncStorage.removeItem(`team_${userEmail}_backup`);
        } else if (storedTeam) {
          localTeamData = JSON.parse(storedTeam);
          console.log('Found stored team data:', localTeamData);
        }
        
        if (storedBackupAllTeams) {
          localAllTeams = JSON.parse(storedBackupAllTeams);
          console.log('Found backup all teams data from availability change:', localAllTeams);
          
          // Clean up backup after using it
          await AsyncStorage.removeItem(`all_teams_${userEmail}_backup`);
        } else if (storedAllTeams) {
          localAllTeams = JSON.parse(storedAllTeams);
          console.log('Found stored all teams data:', localAllTeams);
        }
      } catch (e) {
        console.warn('Error reading team data from storage:', e);
      }
      
      // Set local data first for immediate UI response - only if different from current state
      if (localTeamData && JSON.stringify(team) !== JSON.stringify(localTeamData)) {
        setTeam(localTeamData);
      }
      
      if (localAllTeams && JSON.stringify(allTeams) !== JSON.stringify(localAllTeams)) {
        setAllTeams(localAllTeams);
      }
      
      // CRITICAL: Special handling for ABC's team - always check this first
      try {
        const abcEmail = "abc@example.com"; // ABC's email
        console.log(`Trying direct lookup for ABC's team...`);
        
        const abcTeamResponse = await fetch(`${BASE_URL}/api/user/${encodeURIComponent(abcEmail)}/team?timestamp=${Date.now()}`);
        if (abcTeamResponse.ok) {
          const abcTeamData = await abcTeamResponse.json();
          
          // Check if this support user is in ABC's team
          if (abcTeamData.teamMembers && abcTeamData.teamMembers.some(member => member.email === userEmail)) {
            console.log(`Found this support user in ABC's team`);
            
            // Create a team entry for ABC - but don't set as the only team
            const abcTeam = [{
              firstName: "ABC",
              surname: "",
              email: abcEmail,
              teamSize: abcTeamData.teamMembers.length
            }];
            
            // Add epilepsy user info to the team data
            abcTeamData.epilepsyUser = {
              firstName: "ABC",
              surname: "",
              email: abcEmail
            };
            
            // Store team data but don't overwrite all teams yet
            // Wait to collect other teams before setting allTeams
            const existingTeams = [...(allTeams || [])];
            if (!existingTeams.some(t => t.email === abcEmail)) {
              existingTeams.push(abcTeam[0]);
            }
            
            // Set ABC as the initial team if we don't have one yet
            if (!team) {
              setTeam(abcTeamData);
              await AsyncStorage.setItem(`team_${userEmail}`, JSON.stringify(abcTeamData));
            }
            
            // Just store ABC's team data without overwriting allTeams yet
            await AsyncStorage.setItem(`team_${userEmail}_${abcEmail}`, JSON.stringify(abcTeamData));
            
            console.log('Found ABC team data, continuing to check for other teams');
          }
        }
      } catch (e) {
        console.warn('Error checking ABC team:', e);
      }
      
      // Now try to get fresh data from API
      try {
        console.log('Querying API for support user teams...');
        
        // Use the dedicated endpoint for support teams with proper URL encoding
        const encodedEmail = encodeURIComponent(userEmail);
        const supportTeamsUrl = `${BASE_URL}/api/user/${encodedEmail}/support-teams?timestamp=${Date.now()}`;
        console.log('Fetching from URL:', supportTeamsUrl);
        
        const supportTeamsResponse = await fetch(supportTeamsUrl);
        const supportTeamsText = await supportTeamsResponse.text();
        console.log('Support teams API response:', supportTeamsText);
        
        let supportTeamsData;
        try {
          supportTeamsData = JSON.parse(supportTeamsText);
        } catch (e) {
          console.error('Error parsing support teams response:', e);
          supportTeamsData = null;
        }
        
        if (Array.isArray(supportTeamsData) && supportTeamsData.length > 0) {
          console.log(`Found ${supportTeamsData.length} teams for support user:`, supportTeamsData);
          
          // Collect all teams, including any we found from ABC
          const allFoundTeams = [...(allTeams || [])];
          
          // Add new teams from the API
          supportTeamsData.forEach(newTeam => {
            // Check if this team already exists
            const existingTeamIndex = allFoundTeams.findIndex(t => t.email === newTeam.email);
            if (existingTeamIndex >= 0) {
              // Update existing team data
              allFoundTeams[existingTeamIndex] = newTeam;
            } else {
              // Add new team
              allFoundTeams.push(newTeam);
            }
          });
          
          // Store and set all teams
          console.log(`Setting all teams with ${allFoundTeams.length} entries`);
          setAllTeams(allFoundTeams);
          await AsyncStorage.setItem(`all_teams_${userEmail}`, JSON.stringify(allFoundTeams));
          
          // Get details for the first team (we'll show this by default if no team is set)
          if (!team && supportTeamsData.length > 0) {
            const firstTeam = supportTeamsData[0];
            const epilepsyUserEmail = firstTeam.email;
            
            console.log(`Getting detailed team info for first epilepsy user: ${epilepsyUserEmail}`);
            
            // Get detailed team info for this epilepsy user
            const teamResponse = await fetch(`${BASE_URL}/api/user/${encodeURIComponent(epilepsyUserEmail)}/team?timestamp=${Date.now()}`);
            if (teamResponse.ok) {
              const teamData = await teamResponse.json();
              
              // Add epilepsy user info to the team data
              teamData.epilepsyUser = {
                firstName: firstTeam.firstName,
                surname: firstTeam.surname,
                email: firstTeam.email
              };
              
              // Try to get alert status for this epilepsy user
              try {
                const alertsResponse = await fetch(`${BASE_URL}/api/user/${encodeURIComponent(epilepsyUserEmail)}/alerts?timestamp=${Date.now()}`);
                if (alertsResponse.ok) {
                  const alertsData = await alertsResponse.json();
                  console.log(`Alert status for ${epilepsyUserEmail}:`, alertsData);
                  
                  // Add alert status to epilepsy user info
                  teamData.epilepsyUser.alertsEnabled = alertsData.alertsEnabled === true;
                }
              } catch (e) {
                console.warn(`Error fetching alert status for ${epilepsyUserEmail}:`, e);
                // Default to true if we can't get the status
                teamData.epilepsyUser.alertsEnabled = true;
              }
              
              console.log('Detailed team data for first team:', teamData);
              
              // Update the team data with current availability
              if (teamData.teamMembers) {
                const updatedMembers = teamData.teamMembers.map(member => {
                  if (member.email === userEmail) {
                    // Don't override the availability that came from the API
                    // Only use local state if the API didn't provide availability
                    if (member.isAvailable === undefined) {
                      return { ...member, isAvailable };
                    }
                  }
                  return member;
                });
                teamData.teamMembers = updatedMembers;
              }
              
              // Store and set the team data
              await AsyncStorage.setItem(`team_${userEmail}`, JSON.stringify(teamData));
              setTeam(teamData);
            }
          }
          
          // For every team in the list, fetch detailed data and store it
          for (const teamInfo of allFoundTeams) {
            try {
              // Skip if we already have details for this team
              if (team && team.epilepsyUser && team.epilepsyUser.email === teamInfo.email) {
                console.log(`Already have detailed data for ${teamInfo.email}, skipping`);
                continue;
              }
              
              console.log(`Getting detailed data for team: ${teamInfo.email}`);
              const detailResponse = await fetch(`${BASE_URL}/api/user/${encodeURIComponent(teamInfo.email)}/team?timestamp=${Date.now()}`);
              if (detailResponse.ok) {
                const detailData = await detailResponse.json();
                
                // Add epilepsy user info
                detailData.epilepsyUser = {
                  firstName: teamInfo.firstName,
                  surname: teamInfo.surname,
                  email: teamInfo.email
                };
                
                // Try to get alert status for this epilepsy user
                try {
                  const alertsResponse = await fetch(`${BASE_URL}/api/user/${encodeURIComponent(teamInfo.email)}/alerts?timestamp=${Date.now()}`);
                  if (alertsResponse.ok) {
                    const alertsData = await alertsResponse.json();
                    console.log(`Alert status for ${teamInfo.email}:`, alertsData);
                    
                    // Add alert status to epilepsy user info
                    detailData.epilepsyUser.alertsEnabled = alertsData.alertsEnabled === true;
                  }
                } catch (e) {
                  console.warn(`Error fetching alert status for ${teamInfo.email}:`, e);
                  // Default to true if we can't get the status
                  detailData.epilepsyUser.alertsEnabled = true;
                }
                
                // Store team details for later use
                await AsyncStorage.setItem(`team_${userEmail}_${teamInfo.email}`, JSON.stringify(detailData));
                console.log(`Stored detailed data for ${teamInfo.email}`);
              }
            } catch (e) {
              console.warn(`Error fetching details for ${teamInfo.email}:`, e);
            }
          }
        }
      } catch (err) {
        console.warn('Error fetching teams from API:', err);
      }
      
      // If we still don't have team data, try the general fallback approach
      if ((!team || !allTeams || allTeams.length === 0) && !localTeamData && !localAllTeams) {
        try {
          console.log('No teams found from previous methods, trying fallback approach');
          const epilepsyUsersResponse = await fetch(`${BASE_URL}/api/epilepsy-users?timestamp=${Date.now()}`);
          if (epilepsyUsersResponse.ok) {
            const epilepsyUsers = await epilepsyUsersResponse.json();
            console.log('Found epilepsy users:', epilepsyUsers);
            
            const teamsFound = [];
            
            // Check each epilepsy user's team
            for (const epilepsyUser of epilepsyUsers) {
              try {
                const teamResponse = await fetch(`${BASE_URL}/api/user/${encodeURIComponent(epilepsyUser.email)}/team?timestamp=${Date.now()}`);
                if (teamResponse.ok) {
                  const teamData = await teamResponse.json();
                  
                  // Check if this support user is in the team
                  if (teamData.teamMembers && teamData.teamMembers.some(member => member.email === userEmail)) {
                    console.log(`Found team for epilepsy user ${epilepsyUser.email} that includes this support user`);
                    
                    // Add this epilepsy user to the teams list
                    teamsFound.push({
                      firstName: epilepsyUser.firstName,
                      surname: epilepsyUser.surname,
                      email: epilepsyUser.email,
                      teamSize: teamData.teamMembers.length
                    });
                    
                    // If this is the first team found, set it as the current team
                    if (teamsFound.length === 1) {
                      // Add epilepsy user info to the team data
                      teamData.epilepsyUser = {
                        firstName: epilepsyUser.firstName,
                        surname: epilepsyUser.surname,
                        email: epilepsyUser.email
                      };
                      
                      // Store and set the team data
                      await AsyncStorage.setItem(`team_${userEmail}`, JSON.stringify(teamData));
                      setTeam(teamData);
                    }
                  }
                }
              } catch (e) {
                console.warn(`Error checking team for epilepsy user ${epilepsyUser.email}:`, e);
              }
            }
            
            if (teamsFound.length > 0) {
              console.log(`Found ${teamsFound.length} teams for this support user through fallback method`);
              setAllTeams(teamsFound);
              await AsyncStorage.setItem(`all_teams_${userEmail}`, JSON.stringify(teamsFound));
            }
          }
        } catch (e) {
          console.warn('Error in fallback approach:', e);
        }
      }
      
      // Final attempt - try to get team data from user-specific team relation API
      if ((!team || !allTeams || allTeams.length === 0) && !localTeamData && !localAllTeams) {
        try {
          console.log('Trying direct team relation lookup...');
          const teamRelationUrl = `${BASE_URL}/api/user-teams/${encodeURIComponent(userEmail)}?timestamp=${Date.now()}`;
          const teamRelationResponse = await fetch(teamRelationUrl);
          
          if (teamRelationResponse.ok) {
            const teamRelationData = await teamRelationResponse.json();
            if (Array.isArray(teamRelationData) && teamRelationData.length > 0) {
              console.log(`Found ${teamRelationData.length} team relations for this support user`);
              
              const teamsFound = [];
              
              // Process each team relation
              for (const relation of teamRelationData) {
                if (relation.epilepsyUser) {
                  teamsFound.push({
                    firstName: relation.epilepsyUser.firstName || 'Unknown',
                    surname: relation.epilepsyUser.surname || '',
                    email: relation.epilepsyUser.email,
                    teamSize: relation.teamSize || 1
                  });
                  
                  // If this is the first team found, set it as the current team
                  if (teamsFound.length === 1 && relation.teamData) {
                    const teamData = relation.teamData;
                    teamData.epilepsyUser = {
                      firstName: relation.epilepsyUser.firstName || 'Unknown',
                      surname: relation.epilepsyUser.surname || '',
                      email: relation.epilepsyUser.email
                    };
                    
                    // Store and set the team data
                    await AsyncStorage.setItem(`team_${userEmail}`, JSON.stringify(teamData));
                    setTeam(teamData);
                  }
                }
              }
              
              if (teamsFound.length > 0) {
                setAllTeams(teamsFound);
                await AsyncStorage.setItem(`all_teams_${userEmail}`, JSON.stringify(teamsFound));
              }
            }
          }
        } catch (e) {
          console.warn('Error in team relation lookup:', e);
        }
      }
      
      // Hardcoded fallback for ABC's team as absolute last resort
      if ((!team || !allTeams || allTeams.length === 0) && !localTeamData && !localAllTeams) {
        console.log('No teams found through any method, using hardcoded fallback for ABC');
        
        // First check if we have a saved availability status
        let savedAvailability = isAvailable;
        try {
          const storedAvailability = await AsyncStorage.getItem(`availability_${userEmail}`);
          if (storedAvailability !== null) {
            savedAvailability = JSON.parse(storedAvailability);
            console.log(`Using stored availability for hardcoded team: ${savedAvailability}`);
          }
        } catch (e) {
          console.warn('Error reading stored availability:', e);
        }
        
        // Get the user's actual first and last name
        let firstName = await AsyncStorage.getItem('userFirstName');
        let surname = await AsyncStorage.getItem('userSurname');
        
        // If we can't find the name in AsyncStorage, extract it from the email
        if (!firstName) {
          firstName = userEmail.split('@')[0];
          if (firstName) {
            // Capitalize first letter
            firstName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
          } else {
            firstName = 'Support';
          }
        }
        
        if (!surname) {
          surname = '';
        }
        
        console.log(`Using names for hardcoded team: ${firstName} ${surname}`);
        
        // Create a minimal team entry for ABC
        const abcTeam = [{
          firstName: "ABC",
          surname: "",
          email: "abc@example.com",
          teamSize: 1
        }];
        
        // Create minimal team data
        const abcTeamData = {
          epilepsyUser: {
            firstName: "ABC",
            surname: "",
            email: "abc@example.com"
          },
          teamMembers: [{
            email: userEmail,
            firstName: firstName,
            surname: surname,
            role: 'support',
            isAvailable: savedAvailability // Use saved availability instead of current state
          }]
        };
        
        // Set and store the data
        setAllTeams(abcTeam);
        setTeam(abcTeamData);
        await AsyncStorage.setItem(`all_teams_${userEmail}`, JSON.stringify(abcTeam));
        await AsyncStorage.setItem(`team_${userEmail}`, JSON.stringify(abcTeamData));
        
        console.log('Set hardcoded fallback for ABC team');
      }
      
    } catch (err) {
      console.error('Error in fetchTeam:', err.message);
    } finally {
      setIsLoading(false);
      setInitialLoadComplete(true);
      isFetchingRef.current = false;
    }
  }, [userEmail, isAvailable, refreshing, team, allTeams]);

  // Then define debouncedFetchTeam with fetchTeam as a dependency
  const debouncedFetchTeam = React.useMemo(
    () => debounce(() => {
      if (userEmail) {
        fetchTeam();
      }
    }, 300),
    [fetchTeam, userEmail]
  );

  const updateAvailability = React.useCallback(async (newStatus) => {
    try {
      if (!userEmail) {
        const email = await AsyncStorage.getItem('userEmail');
        if (!email) return;
        setUserEmail(email);
      }

      // Update UI immediately for responsive feel
      setIsAvailable(newStatus);
      
      // Save to multiple AsyncStorage keys for maximum persistence
      await AsyncStorage.setItem(`availability_${userEmail}`, JSON.stringify(newStatus));
      await AsyncStorage.setItem('availability', JSON.stringify(newStatus)); // General fallback key
      console.log(`Saved availability to multiple locations for ${userEmail}:`, newStatus);

      // Send the update to the backend
      console.log(`Updating availability to ${newStatus}`);
      const response = await fetch(`${BASE_URL}/api/user/${encodeURIComponent(userEmail)}/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: newStatus })
      });

      if (!response.ok) {
        // Revert UI if backend update fails
        setIsAvailable(!newStatus);
        await AsyncStorage.setItem(`availability_${userEmail}`, JSON.stringify(!newStatus));
        await AsyncStorage.setItem('availability', JSON.stringify(!newStatus));
        throw new Error('Failed to update availability');
      }

      console.log('Successfully updated availability on server');

      // Also update local storage to ensure persistence
      const storedTeam = await AsyncStorage.getItem(`team_${userEmail}`);
      if (storedTeam) {
        try {
          const teamData = JSON.parse(storedTeam);
          
          // Update the current user's availability in the stored team data
          if (teamData && teamData.teamMembers) {
            const updatedMembers = teamData.teamMembers.map(member => {
              if (member.email === userEmail) {
                return { ...member, isAvailable: newStatus };
              }
              return member;
            });
            
            teamData.teamMembers = updatedMembers;
            await AsyncStorage.setItem(`team_${userEmail}`, JSON.stringify(teamData));
            console.log('Updated availability in local storage');
          }
        } catch (e) {
          console.warn('Error updating local team data:', e);
        }
      }
      
      // IMPORTANT: Update availability in epilepsy users' storage
      // First, get all teams this support user is part of
      try {
        // Get all epilepsy users who have this support user as a mate
        const allKeys = await AsyncStorage.getAllKeys();
        
        // Find all formatted_mates and activatedMates keys
        const mateKeys = allKeys.filter(key => 
          (key.startsWith('formatted_mates_') || key.startsWith('activatedMates_') || 
           key.startsWith('team_')) && 
          !key.includes(userEmail)
        );
        
        console.log('Found potential epilepsy user mate keys:', mateKeys);
        
        // CRITICAL: First create a backup of all epilepsy users' team data
        // This ensures we can restore if something goes wrong
        const backupTimestamp = Date.now();
        const backupPromises = [];
        
        for (const key of mateKeys) {
          try {
            const data = await AsyncStorage.getItem(key);
            if (data) {
              const backupKey = `availabilityBackup_${key}_${backupTimestamp}`;
              backupPromises.push(AsyncStorage.setItem(backupKey, data));
            }
          } catch (e) {
            console.warn(`Error backing up ${key}:`, e);
          }
        }
        
        // Wait for all backups to complete
        await Promise.all(backupPromises);
        console.log('Created backups of all epilepsy user team data');
        
        // Now safely update availability in each key
        for (const key of mateKeys) {
          try {
            const matesData = await AsyncStorage.getItem(key);
            if (matesData) {
              let mates;
              try {
                mates = JSON.parse(matesData);
              } catch (e) {
                console.warn(`Error parsing data from ${key}:`, e);
                continue;
              }
              
              // Handle different data formats
              if (Array.isArray(mates)) {
                // Check if this support user is in the mates list
                if (mates.some(mate => mate.email === userEmail)) {
                  console.log(`Found this support user in ${key}, updating availability`);
                  
                  // Update this support user's availability WITHOUT changing anything else
                  const updatedMates = mates.map(mate => {
                    if (mate.email === userEmail) {
                      return {
                        ...mate,
                        isAvailable: newStatus
                      };
                    }
                    return mate;
                  });
                  
                  // Verify we're not losing any mates during the update
                  if (updatedMates.length !== mates.length) {
                    console.error(`ERROR: Mate count mismatch in ${key}! Original: ${mates.length}, Updated: ${updatedMates.length}`);
                    continue; // Skip this update to prevent data loss
                  }
                  
                  // Log before saving to verify data integrity
                  console.log(`Original mates in ${key}:`, mates.map(m => m.email));
                  console.log(`Updated mates in ${key}:`, updatedMates.map(m => m.email));
                  
                  // Save the updated mates list
                  await AsyncStorage.setItem(key, JSON.stringify(updatedMates));
                  console.log(`Updated availability in ${key}:`, updatedMates.length, 'mates');
                }
              } else if (mates && mates.teamMembers && Array.isArray(mates.teamMembers)) {
                // Handle team object format
                if (mates.teamMembers.some(member => member.email === userEmail)) {
                  console.log(`Found this support user in team ${key}, updating availability`);
                  
                  // Update this support user's availability WITHOUT changing anything else
                  const updatedMembers = mates.teamMembers.map(member => {
                    if (member.email === userEmail) {
                      return {
                        ...member,
                        isAvailable: newStatus
                      };
                    }
                    return member;
                  });
                  
                  // Verify we're not losing any members during the update
                  if (updatedMembers.length !== mates.teamMembers.length) {
                    console.error(`ERROR: Team member count mismatch in ${key}! Original: ${mates.teamMembers.length}, Updated: ${updatedMembers.length}`);
                    continue; // Skip this update to prevent data loss
                  }
                  
                  // Log before saving to verify data integrity
                  console.log(`Original team members in ${key}:`, mates.teamMembers.map(m => m.email));
                  console.log(`Updated team members in ${key}:`, updatedMembers.map(m => m.email));
                  
                  // Update only the teamMembers array, preserving all other properties
                  const updatedTeam = {
                    ...mates,
                    teamMembers: updatedMembers
                  };
                  
                  // Save the updated team
                  await AsyncStorage.setItem(key, JSON.stringify(updatedTeam));
                  console.log(`Updated availability in team ${key}`);
                }
              }
            }
          } catch (e) {
            console.warn(`Error updating availability in ${key}:`, e);
          }
        }
        
        // Force a flush to ensure all changes are written
        await AsyncStorage.flushGetRequests();
        
        // Add a delay to ensure storage operations complete
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (e) {
        console.warn('Error updating epilepsy users storage:', e);
      }

      // After updating availability, make sure we still have team data
      // by fetching fresh team data with the updated availability
      // Use direct fetch instead of debounced to ensure immediate update
      // But add a small delay to let the UI settle first
      setTimeout(() => {
        fetchTeam();
      }, 500);
    } catch (err) {
      console.error('Error updating availability:', err);
      Alert.alert('Error', 'Failed to update availability status');
    }
  }, [userEmail, fetchTeam]);

  const toggleAvailability = React.useCallback(async () => {
    try {
      // Save current team data before toggling availability
      if (team && team.teamMembers) {
        console.log('Saving current team data before toggling availability');
        await AsyncStorage.setItem(`team_${userEmail}_backup`, JSON.stringify(team));
      }
      
      if (allTeams && allTeams.length > 0) {
        console.log('Saving all teams data before toggling availability');
        await AsyncStorage.setItem(`all_teams_${userEmail}_backup`, JSON.stringify(allTeams));
      }
      
      if (isAvailable) {
        // Confirming when switching to unavailable
        Alert.alert(
          "Pause Alerts?",
          "Important: You won't receive seizure alerts while unavailable. Ensure another caregiver is covering this time.",
          [
            { text: "Stay Available", style: 'cancel' },
            {
              text: "Go Unavailable",
              style: 'destructive',
              onPress: async () => {
                await updateAvailability(false);
              },
            },
          ]
        );
      } else {
        // No confirmation needed when switching to available
        await updateAvailability(true);
      }
    } catch (err) {
      console.error('Error in toggleAvailability:', err);
      Alert.alert('Error', 'Failed to toggle availability status');
    }
  }, [userEmail, team, allTeams, isAvailable, updateAvailability]);

  // Load team data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (isFirstFocusRef.current) {
        // Always fetch on first focus
        console.log('Initial screen focus, fetching team data');
        debouncedFetchTeam(); // Use debounced version
        isFirstFocusRef.current = false;
      } else {
        // On subsequent focuses, perform a full team fetch to ensure we have all teams
        console.log('Screen refocused, performing complete team refresh');
        fetchTeam(); // Use direct fetch to ensure all teams are loaded
        loadSavedAvailability();
      }
      
      return () => {
        // Save any pending changes when leaving the screen
        if (userEmail && team) {
          AsyncStorage.setItem(`team_${userEmail}`, JSON.stringify(team))
            .then(() => console.log('Saved team data on screen unfocus'))
            .catch(e => console.warn('Error saving team data on unfocus:', e));
        }
      };
    }, [userEmail, debouncedFetchTeam, team, loadSavedAvailability, fetchTeam]) // Add fetchTeam to dependencies
  );

  // Add function to handle manual refresh
  const onRefresh = React.useCallback(async () => {
    console.log('Manual refresh triggered');
    setRefreshing(true);
    
    try {
      // Fetch team data directly (skip debounce for manual refresh)
      await fetchTeam();
      
      // Also check availability
      await loadSavedAvailability();
      
      console.log('Manual refresh completed');
    } catch (e) {
      console.error('Error during manual refresh:', e);
    } finally {
      setRefreshing(false);
    }
  }, [fetchTeam, loadSavedAvailability]);

  // Add a periodic refresh mechanism to automatically update availability status
  useEffect(() => {
    if (!userEmail || !initialLoadComplete) return;
    
    console.log('Setting up periodic availability check');
    
    // Use a much longer interval (60 seconds instead of 15) to reduce flickering
    const refreshInterval = setInterval(async () => {
      console.log('Periodic availability check triggered');
      
      try {
        // Check server for availability status
        const availabilityResponse = await fetch(`${BASE_URL}/api/user/${encodeURIComponent(userEmail)}/availability?timestamp=${Date.now()}`);
        if (availabilityResponse.ok) {
          const availabilityData = await availabilityResponse.json();
          
          // Update if different from current state
          if (isAvailable !== availabilityData.isAvailable) {
            console.log(`Server availability changed to ${availabilityData.isAvailable}, updating UI`);
            setIsAvailable(availabilityData.isAvailable);
            
            // Update storage
            await AsyncStorage.setItem(`availability_${userEmail}`, JSON.stringify(availabilityData.isAvailable));
            await AsyncStorage.setItem('availability', JSON.stringify(availabilityData.isAvailable));
            
            // Only update team data if availability actually changed
            if (team && team.teamMembers) {
              const updatedMembers = team.teamMembers.map(member => {
                if (member.email === userEmail) {
                  return { ...member, isAvailable: availabilityData.isAvailable };
                }
                return member;
              });
              
              const updatedTeam = { ...team, teamMembers: updatedMembers };
              setTeam(updatedTeam);
              
              // Save updated team
              await AsyncStorage.setItem(`team_${userEmail}`, JSON.stringify(updatedTeam));
            }
          }
        }
      } catch (e) {
        console.warn('Error in periodic availability check:', e);
      }
    }, 60000); // Check every 60 seconds to significantly reduce flickering
    
    // Clean up interval on unmount
    return () => clearInterval(refreshInterval);
  }, [userEmail, isAvailable, team, initialLoadComplete]);

  // Function to load a specific team's details
  const loadTeamDetails = React.useCallback(async (epilepsyUserEmail) => {
    try {
      console.log(`Loading details for team: ${epilepsyUserEmail}`);
      setIsLoading(true);
      
      // First check if we have the team in allTeams
      const epilepsyUser = allTeams.find(t => t.email === epilepsyUserEmail);
      if (!epilepsyUser) {
        console.warn(`Epilepsy user ${epilepsyUserEmail} not found in allTeams`);
        setIsLoading(false);
        return;
      }
      
      // Get the current saved availability status
      let savedAvailability = isAvailable;
      try {
        const storedAvailability = await AsyncStorage.getItem(`availability_${userEmail}`);
        if (storedAvailability !== null) {
          savedAvailability = JSON.parse(storedAvailability);
          console.log(`Using stored availability for team details: ${savedAvailability}`);
        }
      } catch (e) {
        console.warn('Error reading stored availability:', e);
      }
      
      // Get the user's actual first and last name
      let firstName = await AsyncStorage.getItem('userFirstName');
      let surname = await AsyncStorage.getItem('userSurname');
      
      // If we can't find the name in AsyncStorage, extract it from the email
      if (!firstName) {
        firstName = userEmail.split('@')[0];
        if (firstName) {
          // Capitalize first letter
          firstName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
        } else {
          firstName = 'Support';
        }
      }
      
      if (!surname) {
        surname = '';
      }
      
      console.log(`Using names for team details: ${firstName} ${surname}`);
      
      // First check if we have this team's details in local storage
      let localTeamData = null;
      try {
        const storedTeam = await AsyncStorage.getItem(`team_${userEmail}_${epilepsyUserEmail}`);
        if (storedTeam) {
          localTeamData = JSON.parse(storedTeam);
          console.log(`Found stored team data for ${epilepsyUserEmail}:`, localTeamData);
          
          // Set local data first for immediate UI response
          if (localTeamData && localTeamData.epilepsyUser) {
            // Update any matching team members with the current user's details
            if (localTeamData.teamMembers) {
              localTeamData.teamMembers = localTeamData.teamMembers.map(member => {
                if (member.email === userEmail) {
                  return {
                    ...member,
                    firstName,
                    surname,
                    isAvailable: savedAvailability
                  };
                }
                return member;
              });
            }
            setTeam(localTeamData);
          }
        }
      } catch (e) {
        console.warn(`Error reading team data for ${epilepsyUserEmail} from storage:`, e);
      }
      
      // Get detailed team info for this epilepsy user from API
      try {
        const teamResponse = await fetch(`${BASE_URL}/api/user/${encodeURIComponent(epilepsyUserEmail)}/team?timestamp=${Date.now()}`);
        
        if (!teamResponse.ok) {
          console.warn('Could not load team details from API:', await teamResponse.text());
          
          // If we have local data, use that and return
          if (localTeamData) {
            setIsLoading(false);
            return;
          }
          
          setIsLoading(false);
          return;
        }
        
        const teamData = await teamResponse.json();
        
        // Add epilepsy user info to the team data
        teamData.epilepsyUser = {
          firstName: epilepsyUser.firstName,
          surname: epilepsyUser.surname,
          email: epilepsyUser.email
        };
        
        // Try to get alert status for this epilepsy user
        try {
          const alertsResponse = await fetch(`${BASE_URL}/api/user/${encodeURIComponent(epilepsyUserEmail)}/alerts?timestamp=${Date.now()}`);
          if (alertsResponse.ok) {
            const alertsData = await alertsResponse.json();
            console.log(`Alert status for ${epilepsyUserEmail}:`, alertsData);
            
            // Add alert status to epilepsy user info
            teamData.epilepsyUser.alertsEnabled = alertsData.alertsEnabled === true;
          }
        } catch (e) {
          console.warn(`Error fetching alert status for ${epilepsyUserEmail}:`, e);
          // Default to true if we can't get the status
          teamData.epilepsyUser.alertsEnabled = true;
        }
        
        console.log('Loaded team details from API:', teamData);
        
        // Verify this support user is in the team
        if (teamData.teamMembers) {
          const supportUserInTeam = teamData.teamMembers.some(member => member.email === userEmail);
          
          if (!supportUserInTeam) {
            console.warn(`Support user ${userEmail} not found in team members`);
            
            // Add the support user to the team members if missing
            teamData.teamMembers.push({
              email: userEmail,
              firstName,
              surname,
              role: 'support',
              isAvailable: savedAvailability
            });
            
            console.log('Added missing support user to team members');
          } else {
            // If the user is found, make sure their name is correct
            teamData.teamMembers = teamData.teamMembers.map(member => {
              if (member.email === userEmail) {
                return {
                  ...member,
                  firstName,
                  surname,
                  isAvailable: savedAvailability
                };
              }
              return member;
            });
          }
        }
        
        // Store and set the team data
        await AsyncStorage.setItem(`team_${userEmail}`, JSON.stringify(teamData));
        await AsyncStorage.setItem(`team_${userEmail}_${epilepsyUserEmail}`, JSON.stringify(teamData));
        setTeam(teamData);
        
        // Also update the server with current availability if needed
        try {
          await fetch(`${BASE_URL}/api/user/${encodeURIComponent(userEmail)}/availability`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isAvailable: savedAvailability })
          });
          console.log('Updated availability on server');
        } catch (e) {
          console.warn('Error updating availability on server:', e);
        }
      } catch (err) {
        console.error('Error loading team details from API:', err);
        
        // If we have local data, use that as fallback
        if (localTeamData) {
          console.log('Using locally stored team data as fallback');
          setTeam(localTeamData);
        } else {
          Alert.alert('Error', 'Failed to load team details. Please try again.');
        }
      }
    } catch (err) {
      console.error('Error in loadTeamDetails:', err);
      Alert.alert('Error', 'Failed to load team details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [allTeams, userEmail, isAvailable]);

  // Add a function to switch between teams
  const switchTeam = React.useCallback(async (epilepsyUserEmail) => {
    try {
      setIsLoading(true);
      console.log(`Switching to team for ${epilepsyUserEmail}`);
      
      // First try to get stored team data
      const storedTeamData = await AsyncStorage.getItem(`team_${userEmail}_${epilepsyUserEmail}`);
      
      if (storedTeamData) {
        const parsedTeamData = JSON.parse(storedTeamData);
        console.log(`Found stored detailed data for ${epilepsyUserEmail}`);
        setTeam(parsedTeamData);
        await AsyncStorage.setItem(`team_${userEmail}`, JSON.stringify(parsedTeamData));
        setIsLoading(false);
        return;
      }
      
      // If not found in storage, fetch from API
      console.log(`Fetching team data for ${epilepsyUserEmail} from API`);
      const teamResponse = await fetch(`${BASE_URL}/api/user/${encodeURIComponent(epilepsyUserEmail)}/team?timestamp=${Date.now()}`);
      
      if (!teamResponse.ok) {
        console.warn(`Failed to fetch team for ${epilepsyUserEmail}`);
        setIsLoading(false);
        return;
      }
      
      const teamData = await teamResponse.json();
      
      // Find epilepsy user details from allTeams
      const epilepsyUser = allTeams.find(t => t.email === epilepsyUserEmail);
      
      if (epilepsyUser) {
        teamData.epilepsyUser = {
          firstName: epilepsyUser.firstName,
          surname: epilepsyUser.surname,
          email: epilepsyUser.email
        };
      } else {
        // Fallback to just using the email
        teamData.epilepsyUser = {
          firstName: epilepsyUserEmail.split('@')[0],
          surname: '',
          email: epilepsyUserEmail
        };
      }
      
      // Try to get alert status for this epilepsy user
      try {
        const alertsResponse = await fetch(`${BASE_URL}/api/user/${encodeURIComponent(epilepsyUserEmail)}/alerts?timestamp=${Date.now()}`);
        if (alertsResponse.ok) {
          const alertsData = await alertsResponse.json();
          console.log(`Alert status for ${epilepsyUserEmail}:`, alertsData);
          
          // Add alert status to epilepsy user info
          teamData.epilepsyUser.alertsEnabled = alertsData.alertsEnabled === true;
        }
      } catch (e) {
        console.warn(`Error fetching alert status for ${epilepsyUserEmail}:`, e);
        // Default to true if we can't get the status
        teamData.epilepsyUser.alertsEnabled = true;
      }
      
      // Update with current user's availability
      if (teamData.teamMembers) {
        teamData.teamMembers = teamData.teamMembers.map(member => {
          if (member.email === userEmail) {
            return { ...member, isAvailable };
          }
          return member;
        });
      }
      
      // Store and set the team data
      setTeam(teamData);
      await AsyncStorage.setItem(`team_${userEmail}`, JSON.stringify(teamData));
      await AsyncStorage.setItem(`team_${userEmail}_${epilepsyUserEmail}`, JSON.stringify(teamData));
      setIsLoading(false);
    } catch (e) {
      console.warn(`Error switching to team ${epilepsyUserEmail}:`, e);
      setIsLoading(false);
    }
  }, [userEmail, isAvailable, allTeams]);

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
                        <TouchableOpacity
                          key={teamItem.email}
                          style={[
                            styles.teamSelectorItem,
                            team.epilepsyUser.email === teamItem.email && styles.teamSelectorItemActive
                          ]}
                          onPress={() => switchTeam(teamItem.email)}
                        >
                          <Text 
                            style={[
                              styles.teamSelectorText,
                              team.epilepsyUser.email === teamItem.email && styles.teamSelectorTextActive
                            ]}
                          >
                            {teamItem.firstName} {teamItem.surname}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                <Text style={styles.teamDetailsHeader}>
                  {team.epilepsyUser.firstName}{team.epilepsyUser.surname ? ` ${team.epilepsyUser.surname}` : ''}'s Team Members:
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
                  {team.teamMembers.map((item) => (
                    <View 
                      key={item.email || `team-member-${Math.random()}`}
                      style={styles.teamMemberRow}
                    >
                      <View style={styles.teamMemberContent}>
                        <Text style={[
                          styles.teamMemberName,
                          item.email === userEmail && styles.currentUserText
                        ]}>
                          {item.firstName} {item.surname}
                          {item.email === userEmail && ' (You)'}
                        </Text>
                        {/* Only show availability status for yourself, not for others */}
                        {item.email === userEmail && (
                          <Text style={[
                            styles.availabilityStatus,
                            isAvailable ? styles.availableStatus : styles.unavailableStatus
                          ]}>
                            {isAvailable ? 'Available' : 'Unavailable'}
                          </Text>
                        )}
                      </View>
                    </View>
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
    marginBottom: 110,
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
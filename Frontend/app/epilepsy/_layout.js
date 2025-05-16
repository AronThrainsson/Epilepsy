import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  Alert,
  StatusBar,
  Platform
} from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeMenuItem, setActiveMenuItem] = useState(null);
  const router = useRouter();
  const pathname = usePathname();

  const COLORS = {
    primary: '#9747FF',
    background: '#F9F0FF',
    white: '#FFFFFF',
    black: '#000000',
  };

  const activeTab = useMemo(() => {
    if (pathname.includes('/epilepsy/log')) return 'log';
    if (pathname.includes('/epilepsy/medicine')) return 'medicine';
    if (pathname.includes('/epilepsy/mates')) return 'mates';
    if (pathname === '/epilepsy') return 'home';
    return null;
  }, [pathname]);

  const handleTabPress = (tab) => {
    if (tab === 'home') router.push('/epilepsy');
    if (tab === 'medicine') router.push('/epilepsy/medicine');
    if (tab === 'log') router.push('/epilepsy/log');
    if (tab === 'mates') router.push('/epilepsy/mates');
  };

  const handleMenuItemPress = (item) => {
    setActiveMenuItem(item);
    setMenuOpen(false);
    if (item === 'Profile') router.push('/epilepsy/profile');
    if (item === 'Location') router.push('/epilepsy/gps');
    if (item === 'Logout') handleLogout();
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: async () => {
            try {
              // First save the current epilepsy user settings
              const userEmail = await AsyncStorage.getItem('userEmail');
              const alertOnValue = await AsyncStorage.getItem(`alertOn_${userEmail}`) || await AsyncStorage.getItem('alertOn');
              
              // Save all mate-related data
              let activatedMatesData = null;
              let formattedMatesData = null;
              let teamData = null;
              let persistentTeamData = null;
              let selectedMatesEmails = null;
              
              try {
                // Get all keys to find mate-related data
                const allKeys = await AsyncStorage.getAllKeys();
                console.log('All keys before logout:', allKeys);
                
                // Get all mate-related data for this user
                activatedMatesData = await AsyncStorage.getItem(`activatedMates_${userEmail}`);
                formattedMatesData = await AsyncStorage.getItem(`formatted_mates_${userEmail}`);
                teamData = await AsyncStorage.getItem(`team_${userEmail}`);
                persistentTeamData = await AsyncStorage.getItem(`persistentTeam_${userEmail}`);
                selectedMatesEmails = await AsyncStorage.getItem(`activatedMatesEmails_${userEmail}`);
                
                console.log('Before logout - Saving mate data:', {
                  activatedMates: activatedMatesData ? 'found' : 'not found',
                  formattedMates: formattedMatesData ? 'found' : 'not found',
                  team: teamData ? 'found' : 'not found',
                  persistentTeam: persistentTeamData ? 'found' : 'not found',
                  selectedMatesEmails: selectedMatesEmails ? 'found' : 'not found'
                });
              } catch (e) {
                console.warn('Failed to preserve mates data:', e);
              }
              
              // CRITICAL: Create a special logout backup with timestamp
              const logoutBackupKey = `logoutBackup_${userEmail}_${Date.now()}`;
              const logoutBackupData = {
                userEmail,
                timestamp: Date.now(),
                activatedMatesData,
                formattedMatesData,
                teamData,
                persistentTeamData,
                selectedMatesEmails
              };
              
              try {
                await AsyncStorage.setItem(logoutBackupKey, JSON.stringify(logoutBackupData));
                console.log('Created logout backup at:', logoutBackupKey);
              } catch (e) {
                console.warn('Failed to create logout backup:', e);
              }
              
              // Identify keys to keep (don't delete these during logout)
              const keysToKeep = [
                'alertOn', 
                `alertOn_${userEmail}`,
                'activatedMates', 
                `activatedMates_${userEmail}`,
                `formatted_mates_${userEmail}`,
                `team_${userEmail}`,
                `persistentTeam_${userEmail}`,
                `activatedMatesEmails_${userEmail}`,
                'persistentTeamSelection',
                logoutBackupKey // Keep our new backup
              ];
              
              // Also keep all availability keys and team backup keys
              const allKeys = await AsyncStorage.getAllKeys();
              const availabilityKeys = allKeys.filter(key => key.startsWith('availability_'));
              const teamBackupKeys = allKeys.filter(key => 
                key.startsWith('teamBackup_') || 
                key.startsWith('logoutBackup_')
              );
              
              const keysToRemove = allKeys.filter(key => 
                !keysToKeep.includes(key) && 
                !availabilityKeys.includes(key) &&
                !teamBackupKeys.includes(key) &&
                key !== 'availability'
              );
              
              await AsyncStorage.multiRemove(keysToRemove);
              
              // Make sure settings are re-saved after clear
              if (alertOnValue && userEmail) {
                await AsyncStorage.setItem(`alertOn_${userEmail}`, alertOnValue);
                await AsyncStorage.setItem('alertOn', alertOnValue);
                console.log(`Preserved alert settings for ${userEmail}:`, alertOnValue);
              }
              
              // Re-save all mate-related data
              const savePromises = [];
              
              if (activatedMatesData && userEmail) {
                savePromises.push(AsyncStorage.setItem(`activatedMates_${userEmail}`, activatedMatesData));
                savePromises.push(AsyncStorage.setItem('activatedMates', activatedMatesData));
              }
              
              if (formattedMatesData && userEmail) {
                savePromises.push(AsyncStorage.setItem(`formatted_mates_${userEmail}`, formattedMatesData));
              }
              
              if (teamData && userEmail) {
                savePromises.push(AsyncStorage.setItem(`team_${userEmail}`, teamData));
              }
              
              if (persistentTeamData && userEmail) {
                savePromises.push(AsyncStorage.setItem(`persistentTeam_${userEmail}`, persistentTeamData));
                savePromises.push(AsyncStorage.setItem('persistentTeamSelection', persistentTeamData));
              }
              
              if (selectedMatesEmails && userEmail) {
                savePromises.push(AsyncStorage.setItem(`activatedMatesEmails_${userEmail}`, selectedMatesEmails));
                savePromises.push(AsyncStorage.setItem('activatedMatesEmails', selectedMatesEmails));
              }
              
              // Wait for all data to be saved
              await Promise.all(savePromises);
              console.log(`Preserved all mates data for ${userEmail}`);
              
              // Force a flush to ensure everything is written to storage
              await AsyncStorage.flushGetRequests();
              
              // Add a small delay to ensure storage operations complete
              await new Promise(resolve => setTimeout(resolve, 300));
              
              router.replace('/login');
            } catch (error) {
              console.error('Error during logout:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  useEffect(() => {
    if (!pathname.includes('/profile') && !pathname.includes('/gps')) {
      setActiveMenuItem(null);
    }
  }, [pathname]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <View style={styles.container}>
      {/* Status bar handling */}
      <StatusBar
        backgroundColor={COLORS.white}
        barStyle="dark-content"
        translucent={Platform.OS === 'android'}
      />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: COLORS.white }]}>
        <View style={styles.headerContent}>
          <Image source={require('../../assets/elogo.png')} style={styles.logo} />
          <Text style={[styles.headerTitle, { color: COLORS.black }]}>Epimate</Text>
          <TouchableOpacity onPress={() => setMenuOpen(!menuOpen)} style={styles.menuButton}>
            <Ionicons name="menu" size={32} color={COLORS.black} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Overlay */}
      {menuOpen && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setMenuOpen(false)}
        />
      )}

      {/* Dropdown Menu */}
      {menuOpen && (
        <View style={[styles.dropdownMenu, { backgroundColor: COLORS.white }]}>
          {['Profile', 'Location', 'Logout'].map((item) => (
            <TouchableOpacity
              key={item}
              style={[
                styles.menuItem,
                activeMenuItem === item && { backgroundColor: '#E9CBFF' },
              ]}
              onPress={() => handleMenuItemPress(item)}
            >
              <Text style={[styles.menuItemText, item === 'Logout' && { color: '#FF3B30' }]}>
                {item}
              </Text>
              {item === 'Logout' && (
                <Ionicons name="log-out-outline" size={20} color="#FF3B30" style={styles.logoutIcon} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        <Slot />
      </View>

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: COLORS.white }]}>
        <View style={styles.footerContent}>
          <FooterButton
            icon={(active) => (
              <Ionicons
                name={active ? 'home' : 'home-outline'}
                size={25}
                color={active ? COLORS.primary : COLORS.black}
              />
            )}
            label="HOME"
            active={activeTab === 'home'}
            onPress={() => handleTabPress('home')}
          />
          <FooterButton
            icon={(active) => (
              <Ionicons
                name="medkit"
                size={25}
                color={active ? COLORS.primary : COLORS.black}
              />
            )}
            label="MEDICINE"
            active={activeTab === 'medicine'}
            onPress={() => handleTabPress('medicine')}
          />
          <FooterButton
            icon={(active) => (
              <FontAwesome
                name="book"
                size={25}
                color={active ? COLORS.primary : COLORS.black}
              />
            )}
            label="LOG"
            active={activeTab === 'log'}
            onPress={() => handleTabPress('log')}
          />
          <FooterButton
            icon={(active) => (
              <Ionicons
                name={active ? 'people' : 'people-outline'}
                size={28}
                color={active ? COLORS.primary : COLORS.black}
              />
            )}
            label="MATES"
            active={activeTab === 'mates'}
            onPress={() => handleTabPress('mates')}
          />
        </View>
      </View>
    </View>
  );
}

function FooterButton({ icon, label, active, onPress }) {
  return (
    <TouchableOpacity style={styles.footerButton} onPress={onPress}>
      {icon(active)}
      <Text style={[styles.footerText, { color: active ? '#9747FF' : '#000' }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F0FF',
  },
  header: {
    width: '100%',
    height: Platform.OS === 'ios' ? 110 : 60,
    paddingTop: Platform.OS === 'ios' ? 50 : 0,
    position: 'absolute',
    top: 0,
    zIndex: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 25,
    height: '100%',
  },
  logo: {
    width: 55,
    height: 55,
    resizeMode: 'contain',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 10,
    flex: 1,
  },
  menuButton: {
    padding: 10,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 5,
  },
  dropdownMenu: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 90 : 60,
    right: 5,
    borderRadius: 8,
    elevation: 5,
    zIndex: 100,
    width: 200,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  menuItem: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 15,
    color: '#000',
  },
  logoutIcon: {
    marginLeft: 10,
  },
  content: {
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 90 : 60,
    marginBottom: Platform.OS === 'ios' ? 85 : 60,
  },
  footer: {
    width: '100%',
    height: Platform.OS === 'ios' ? 85 : 60,
    paddingBottom: Platform.OS === 'ios' ? 25 : 0,
    position: 'absolute',
    bottom: 0,
    zIndex: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: '100%',
  },
  footerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
  },
  footerText: {
    fontSize: 10,
    marginTop: 5,
    fontWeight: '500',
  },
});
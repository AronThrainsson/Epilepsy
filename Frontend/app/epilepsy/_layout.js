import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions, Alert } from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function Layout() {
  const insets = useSafeAreaInsets();
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
              await AsyncStorage.clear();
              router.replace('/login');
            } catch (error) {
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
    <SafeAreaView style={{ flex: 1, paddingTop: insets.top }}>
      <View style={styles.container}>
        {/* Overlay */}
        {menuOpen && (
          <TouchableOpacity
            style={styles.overlay}
            activeOpacity={1}
            onPress={() => setMenuOpen(false)}
          />
        )}

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
    </SafeAreaView>
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
    width: SCREEN_WIDTH,
    height: 55,
    position: 'absolute',
    top: 0,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
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
    top: 45,
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
    marginTop: 110,
    marginBottom: 90,
  },
  footer: {
    width: SCREEN_WIDTH,
    height: 55,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  footerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  footerText: {
    fontSize: 10,
    marginTop: 5,
    fontWeight: '500',
  },
});
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions } from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import { Ionicons, FontAwesome } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeMenuItem, setActiveMenuItem] = useState(null);
  const [setActiveTab] = useState('home');
  const router = useRouter();
  const pathname = usePathname();

  const COLORS = {
    primary: '#9747FF',
    background: '#F9F0FF',
    white: '#FFFFFF',
    black: '#000000',
  };

  const activeTab = useMemo(() => {
      if (pathname.includes('/support/log')) return 'log';
      if (pathname.includes('/support/info')) return 'info';
      if (pathname === '/support') return 'home';
      return null;
    }, [pathname]);

  const handleTabPress = (tab) => {
    if (tab === 'home') router.push('/support');
    if (tab === 'log') router.push('/support/log');
    if (tab === 'info') router.push('/support/info');
  };

  const handleMenuItemPress = (item) => {
    setActiveMenuItem(item);
    setMenuOpen(false);
    if (item === 'Profile') router.push('/support/profile');
    if (item === 'Location') router.push('/support/gps');
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
      {/* Overlay when menu is open */}
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
          {['Profile', 'Location'].map((item) => (
            <TouchableOpacity
              key={item}
              style={[
                styles.menuItem,
                activeMenuItem === item && { backgroundColor: '#E9CBFF' },
              ]}
              onPress={() => handleMenuItemPress(item)}
            >
              <Text style={styles.menuItemText}>{item}</Text>
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
                name={active ? 'information-circle' : 'information-circle-outline'}
                size={28}
                color={active ? COLORS.primary : COLORS.black}
              />
            )}
            label="INFO"
            active={activeTab === 'info'}
            onPress={() => handleTabPress('info')}
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
    width: SCREEN_WIDTH,
    height: 55,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
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
    width: 180,
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
  },
  menuItemText: {
    fontSize: 15,
    color: '#000',
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
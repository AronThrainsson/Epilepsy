import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState('home');
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeMenuItem, setActiveMenuItem] = useState(null);

  const COLORS = {
    primary: '#9747FF',
    background: '#F9F0FF',
    white: '#FFFFFF',
    black: '#000000',
  };

  const icons = {
    home: (focused) => (
      <Ionicons
        name={focused ? 'home' : 'home-outline'}
        size={25}
        color={focused ? COLORS.primary : COLORS.black}
      />
    ),
    medicine: (focused) => (
      <MaterialIcons
        name="medical-services"
        size={25}
        color={focused ? COLORS.primary : COLORS.black}
      />
    ),
    log: (focused) => (
      <FontAwesome
        name="book"
        size={25}
        color={focused ? COLORS.primary : COLORS.black}
      />
    ),
    mates: (focused) => (
      <Ionicons
        name={focused ? 'people' : 'people-outline'}
        size={25}
        color={focused ? COLORS.primary : COLORS.black}
      />
    ),
    menu: () => (
      <Ionicons name="menu" size={32} color={COLORS.black} />
    ),
  };

  return (
    <View style={[styles.mainContainer, { backgroundColor: COLORS.background }]}>
      <View style={[styles.header, { backgroundColor: COLORS.white }]}>
        <Image source={require('../../assets/elogo.png')} style={styles.logo} />
        <Text style={[styles.headerTitle, { color: COLORS.black }]}>Epimate</Text>
        <TouchableOpacity onPress={() => setMenuOpen(!menuOpen)} style={styles.menuButton}>
          {icons.menu()}
        </TouchableOpacity>

        {menuOpen && (
          <View style={[styles.dropdownMenu, { backgroundColor: COLORS.white }]}>
            {['Profile', 'Location', 'Info/What to do'].map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.menuItem,
                  activeMenuItem === item && { backgroundColor: '#E9CBFF' }
                ]}
                onPress={() => {
                  setActiveMenuItem(item);
                  setMenuOpen(false);
                }}
              >
                <Text style={styles.menuItemText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Footer navigation */}
      <View style={[styles.footer, { backgroundColor: COLORS.white }]}>
        <TouchableOpacity style={styles.footerButton} onPress={() => setActiveTab('home')}>
          {icons.home(activeTab === 'home')}
          <Text style={[styles.footerText, { color: activeTab === 'home' ? COLORS.primary : COLORS.black }]}>
            HOME
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerButton} onPress={() => setActiveTab('medicine')}>
          {icons.medicine(activeTab === 'medicine')}
          <Text style={[styles.footerText, { color: activeTab === 'medicine' ? COLORS.primary : COLORS.black }]}>
            MEDICINE
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerButton} onPress={() => setActiveTab('log')}>
          {icons.log(activeTab === 'log')}
          <Text style={[styles.footerText, { color: activeTab === 'log' ? COLORS.primary : COLORS.black }]}>
            LOG
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerButton} onPress={() => setActiveTab('mates')}>
          {icons.mates(activeTab === 'mates')}
          <Text style={[styles.footerText, { color: activeTab === 'mates' ? COLORS.primary : COLORS.black }]}>
            MATES
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  header: {
    height: 110,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 45,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    zIndex: 10,
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
  dropdownMenu: {
    position: 'absolute',
    top: 95,
    right: 20,
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
  footer: {
    height: 90,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  footerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '500',
  },
});
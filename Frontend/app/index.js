import React, { useState, useEffect } from 'react';
import { View, Text, Switch, FlatList, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';

export default function Home() {
// state for all functionality
  const [batteryLevel, setBatteryLevel] = useState(0);
  const [alertOn, setAlertOn] = useState(false);
  const [activatedMates, setActivatedMates] = useState([]);
  const [watchStatus, setWatchStatus] = useState('ok');
  const [activeTab, setActiveTab] = useState('home');
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeMenuItem, setActiveMenuItem] = useState(null);

// color scheme
  const COLORS = {
    primary: '#9747FF',
    background: '#F9F0FF',
    white: '#FFFFFF',
    black: '#000000',
    statusOk: '#d4edda',
    statusError: '#f8d7da'
  };

//icons configuration, from library (the icons are from expo)
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
      <Ionicons
        name="menu"
        size={32}
        color={COLORS.black}
      />
    )
  };

// mock data initialization
  useEffect(() => {
    setBatteryLevel(78);
    setActivatedMates(['name 1', 'name 2', 'name 3', 'name 4']);
    setAlertOn(true);
    // setWatchStatus('error'); // Uncomment to simulate error state
  }, []);

  const toggleAlert = () => {
    setAlertOn(prev => !prev);
    // TODO: Add functionality to alert mates BACKEND!!!!!
  };

  return (
    <View style={[styles.mainContainer, { backgroundColor: COLORS.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: COLORS.white }]}>
        <Image source={require('../assets/elogo.png')} style={styles.logo} />
        <Text style={[styles.headerTitle, { color: COLORS.black }]}>Epimate</Text>
        <TouchableOpacity onPress={() => setMenuOpen(!menuOpen)} style={styles.menuButton}>
          {icons.menu()}
        </TouchableOpacity>

        {/* Dropdown Menu */}
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

      {/* Main Content */}
      <View style={styles.container}>
      {/* Status message + error message */}
      <View style={styles.statusContainer}>
        {/* Status icon */}
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

        {/* Status text */}
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

        {/* watch battery */}
        <View style={styles.centeredRow}>
          <Text style={styles.label}>Watch battery:</Text>
          <Text style={styles.value}>{batteryLevel}%</Text>
        </View>

        {/* alert mates toggle */}
        <View style={styles.alertRow}>
          <Text style={styles.label}>Alert mates:</Text>
          <Switch
            value={alertOn}
            onValueChange={toggleAlert}
            trackColor={{ false: '#767577', true: '#32BF55' }}
            thumbColor={alertOn ? '#ffffff' : '#f4f3f4'}
          />
        </View>

        {/* activated mates list */}
        <View style={styles.centeredContainer}>
          <Text style={styles.labels}>Activated mates:</Text>
          <FlatList
            data={activatedMates}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <View style={styles.mateItem}>
                <Text style={styles.mateText}>{item}</Text>
              </View>
            )}
            contentContainerStyle={styles.centeredMatesList}
          />
        </View>
      </View>

      {/* footer navigation */}
      <View style={[styles.footer, { backgroundColor: COLORS.white }]}>
        <TouchableOpacity
          style={styles.footerButton}
          onPress={() => setActiveTab('home')}
        >
          {icons.home(activeTab === 'home')}
          <Text style={[
            styles.footerText,
            { color: activeTab === 'home' ? COLORS.primary : COLORS.black }
          ]}>
            HOME
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerButton}
          onPress={() => setActiveTab('medicine')}
        >
          {icons.medicine(activeTab === 'medicine')}
          <Text style={[
            styles.footerText,
            { color: activeTab === 'medicine' ? COLORS.primary : COLORS.black }
          ]}>
            MEDICINE
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerButton}
          onPress={() => setActiveTab('log')}
        >
          {icons.log(activeTab === 'log')}
          <Text style={[
            styles.footerText,
            { color: activeTab === 'log' ? COLORS.primary : COLORS.black }
          ]}>
            LOG
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerButton}
          onPress={() => setActiveTab('mates')}
        >
          {icons.mates(activeTab === 'mates')}
          <Text style={[
            styles.footerText,
            { color: activeTab === 'mates' ? COLORS.primary : COLORS.black }
          ]}>
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
  container: {
    flex: 1,
    padding: 20,
    marginBottom: 70,
  },
statusContainer: {
  alignItems: 'center',
  padding: 35,
  marginBottom: 20,
},
statusIconWrapper: {
  marginBottom: 25,
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
  marginBottom: 15,
},
statusSubmessage: {
  fontSize: 14,
  textAlign: 'center',
  marginBottom: 20,
},
errorSteps: {
  marginTop: 10,
},
errorStep: {
  fontSize: 14,
  marginBottom: 5,
  textAlign: 'center',
},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingLeft: 40,
    paddingRight: 65,
  },
  value: {
    fontSize: 18,
    color: '#000',
    textAlign: 'right',
    paddingHorizontal: 35,
  },
  centeredContainer: {
    alignItems: 'center',
    marginTop: 130,
  },
centeredRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 25,
  paddingHorizontal: 40,
},
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginRight: 8,
    marginBottom: 20,
    paddingHorizontal: 25,
  },
    labels: {
      fontSize: 13,
      fontWeight: 'bold',
      color: '#000',
      marginRight: 8,
      marginBottom: 20,
      paddingHorizontal: 25,
    },
  mateItem: {
    backgroundColor: '#E9CBFF',
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
  },
  mateText: {
    fontSize: 13,
    color: '#000',
    margin: 1,
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
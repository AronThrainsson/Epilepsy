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
      
const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
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
});
}

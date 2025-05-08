import React, { useState, useEffect } from 'react';
import { View, Text, Switch, FlatList, StyleSheet } from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';

export default function Home() {
  // state for all functionality
  const [batteryLevel, setBatteryLevel] = useState(0);
  const [alertOn, setAlertOn] = useState(false);
  const [activatedMates, setActivatedMates] = useState([]);
  const [watchStatus, setWatchStatus] = useState('ok');

  // color scheme
  const COLORS = {
    statusOk: '#d4edda',
    statusError: '#f8d7da'
  };

  // mock data initialization
  useEffect(() => {
    setBatteryLevel(78);
    setActivatedMates(['name 1', 'name 2', 'name 3', 'name 4']);
    setAlertOn(true);
    // setWatchStatus('error');
    // Uncomment to simulate error state
  }, []);

  const toggleAlert = () => {
    setAlertOn(prev => !prev);
    // TODO: Add functionality to alert mates BACKEND!!!!!
  };

  return (
    <View style={styles.container}>
      {/* Status message + error message */}
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

      {/* Watch battery */}
      <View style={styles.centeredRow}>
        <Text style={styles.label}>Watch battery:</Text>
        <Text style={styles.value}>{batteryLevel}%</Text>
      </View>

      {/* Alert mates toggle */}
      <View style={styles.alertRow}>
        <Text style={styles.label}>Alert mates:</Text>
        <Switch
          value={alertOn}
          onValueChange={toggleAlert}
          trackColor={{ false: '#767577', true: '#32BF55' }}
          thumbColor={alertOn ? '#ffffff' : '#f4f3f4'}
        />
      </View>

      {/* Activated mates list */}
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
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  statusContainer: {
    alignItems: 'center',
    padding: 35,
    marginBottom: 10,
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
    marginBottom: 20,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingLeft: 40,
    paddingRight: 65,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 70,
  },
  value: {
    fontSize: 18,
    color: '#000',
    textAlign: 'right',
  },
  centeredContainer: {
    alignItems: 'center',
    marginTop: 125,
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
  labels: {
    fontSize: 13,
    color: '#000',
    marginRight: 8,
    marginBottom: 20,
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

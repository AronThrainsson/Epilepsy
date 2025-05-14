import React, { useState, useEffect } from 'react';
import { View, Text, Switch, FlatList, StyleSheet } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

export default function Home() {
  const [batteryLevel, setBatteryLevel] = useState(0);
  const [alertOn, setAlertOn] = useState(false);
  const [activatedMates, setActivatedMates] = useState([]);
  const [watchStatus, setWatchStatus] = useState('ok');

  const loadMates = async () => {
    const storedMates = await AsyncStorage.getItem('activatedMates');
    if (storedMates) {
      setActivatedMates(JSON.parse(storedMates));
    } else {
      setActivatedMates([]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setBatteryLevel(78);
      setAlertOn(true);
      await loadMates();
    };
    loadData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadMates();
    }, [])
  );

  const toggleAlert = () => {
    setAlertOn(prev => !prev);
  };

  return (
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
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <View style={styles.mateItem}>
                <Text style={styles.mateText}>{item}</Text>
              </View>
            )}
            contentContainerStyle={styles.centeredMatesList}
          />
        ) : (
          <Text style={styles.noMatesText}>No mates activated yet</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 70,
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
    marginTop: 125,
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
  noMatesText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
});
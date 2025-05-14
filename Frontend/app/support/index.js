import React, { useState, useEffect } from 'react';
import { View, Text, Switch, FlatList, StyleSheet, Alert, ScrollView } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function Home() {
  const [isAvailable, setIsAvailable] = useState(true);
  const [activatedMates, setActivatedMates] = useState([]);
  const [watchStatus, setWatchStatus] = useState('ok');
  const [activeTab, setActiveTab] = useState('home');
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeMenuItem, setActiveMenuItem] = useState(null);

  const router = useRouter();

  useEffect(() => {
    setActivatedMates(['name 1', 'name 2', 'name 3', 'name 4']);
    setIsAvailable(true);
  }, []);

  const toggleAvailability = () => {
    if (isAvailable) {
      Alert.alert(
        "Pause Alerts?",
        "Important: You won't receive seizure alerts while unavailable. Ensure another caregiver is covering this time.",
        [
          { text: "Stay Available", style: 'cancel' },
          {
            text: "Go Unavailable",
            style: 'destructive',
            onPress: () => setIsAvailable(false),
          },
        ]
      );
    } else {
      setIsAvailable(true);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        {/* Status */}
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
              : 'Your watch is not working properly'}
          </Text>
          {watchStatus === 'error' && (
            <View style={styles.errorSteps}>
              <Text style={styles.errorStep}>1. Check watch connection</Text>
              <Text style={styles.errorStep}>2. Check watch battery</Text>
              <Text style={styles.errorStep}>3. Restart watch</Text>
            </View>
          )}
        </View>

        {/* Availability Toggle */}
        <View style={styles.centeredRow}>
          <Text style={styles.label}>Available:</Text>
          <Switch
            value={isAvailable}
            onValueChange={toggleAvailability}
            trackColor={{ false: '#767577', true: '#32BF55' }}
            thumbColor={isAvailable ? '#ffffff' : '#f4f3f4'}
          />
        </View>

        {/* Activated Mates */}
        <View style={styles.centeredContainer}>
          <Text style={styles.labels}>You are part of this team:</Text>
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
  centeredMatesList: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
import React, { useState, useEffect } from 'react';
import { View, Text, Switch, FlatList, StyleSheet, Alert } from 'react-native';
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
    <View style={styles.mainContainer}>
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
        {watchStatus === 'error' && (
          <View style={styles.errorSteps}>
            <Text style={styles.errorStep}>1. Check watch connection</Text>
            <Text style={styles.errorStep}>2. Check watch battery</Text>
            <Text style={styles.errorStep}>3. Restart watch</Text>
          </View>
        )}
      </View>

      {/* Availability Toggle */}
      <View style={styles.availabilityContainer}>
        <Text style={styles.label}>Available:</Text>
        <Switch
          value={isAvailable}
          onValueChange={toggleAvailability}
          trackColor={{ false: '#767577', true: '#32BF55' }}
          thumbColor={isAvailable ? '#ffffff' : '#f4f3f4'}
        />
      </View>

      {/* Activated Mates */}
      <View style={styles.teamContainer}>
        <Text style={styles.teamLabel}>You are part of this team:</Text>
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
          contentContainerStyle={styles.teamList}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1 },

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
  errorSteps: { marginTop: 10 },
  errorStep: {
    fontSize: 14,
    marginBottom: 5,
    textAlign: 'center',
  },
  availabilityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 90,
    marginHorizontal: 90,
  },
  label: {
     fontSize: 16,
    color: '#000'
  },
  teamContainer: {
    alignItems: 'center',
    marginTop: 110,
    },
  teamLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
    paddingHorizontal: 25,
  },
  teamList: {
    paddingBottom: 10,
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
  },
});

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, Platform } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Linking from 'expo-linking';

export default function GPSSupportScreen() {
  const [userLocation, setUserLocation] = useState(null);
  const [seizureLocation, setSeizureLocation] = useState({
    latitude: 55.6761, // example: Copenhagen
    longitude: 12.5683,
  });

  useEffect(() => {
    const getUserLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to use this feature.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation(location.coords);
    };

    getUserLocation();
  }, []);

  const openNavigation = () => {
    const { latitude, longitude } = seizureLocation;

    const url = Platform.select({
      ios: `http://maps.apple.com/?daddr=${latitude},${longitude}`,
      android: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
    });

    Linking.openURL(url);
  };

  if (!userLocation) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text>Getting your location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Location</Text>
      <MapView
        style={styles.map}
        showsUserLocation={true}
        initialRegion={{
          latitude: seizureLocation.latitude,
          longitude: seizureLocation.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        <Marker
          coordinate={seizureLocation}
          title="Seizure Location"
          description="This is where the seizure was reported"
          pinColor="red"
        />
      </MapView>

      <TouchableOpacity style={styles.navigateButton} onPress={openNavigation}>
        <Text style={styles.buttonText}>Open Route in Maps</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  map: {
    width: '100%',
    height: 400,
    borderRadius: 10,
  },
  navigateButton: {
    marginTop: 20,
    backgroundColor: '#4F46E5',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
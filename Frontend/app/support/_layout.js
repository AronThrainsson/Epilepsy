import { Tabs } from 'expo-router';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

export default function SupportLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#000',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: { paddingBottom: 5, height: 60 },
      }}
    >
      <Tabs.Screen
        name="screens/home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="screens/log"
        options={{
          title: 'Log',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="list-alt" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="screens/info"
        options={{
          title: 'Info',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="info-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="screens/gps"
        options={{
          title: 'GPS',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="map-marker-alt" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
import { Tabs } from 'expo-router';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

export default function EpilepsyLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#000',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: { paddingBottom: 5, height: 60 },
      }}
    >
      <Tabs.Screen
        name="screens/index"
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
        name="screens/medication"
        options={{
          title: 'Medication',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="pills" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="screens/support"
        options={{
          title: 'Support',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="screens/info"
        options={{
          title: 'Info',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="information-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="screens/watch"
        options={{
          title: 'Smartwatch',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bluetooth-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="screens/gps"
        options={{
          title: 'GPS',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="location-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
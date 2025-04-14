import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';

export default function Index() {
  const router = useRouter();

  return (
    <Animated.View entering={FadeIn.duration(800)} style={styles.container}>
      <Image
        source={require('../assets/image.png')} // Update to your logo
        style={styles.logo}
      />

      <Text style={styles.title}>Welcome to EpiMate</Text>
      <Text style={styles.subtitle}>
        A personal companion for everyday use
      </Text>

      <TouchableOpacity
        style={styles.buttonPrimary}
        onPress={() => router.push('/login')}
      >
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.buttonSecondary}
        onPress={() => router.push('/signup')}
      >
        <Text style={styles.buttonText}>Create Account</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 30,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#2E3A59',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 40,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  buttonPrimary: {
    backgroundColor: '#CB97F0',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    marginBottom: 15,
  },
  buttonSecondary: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
  },
  buttonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
});
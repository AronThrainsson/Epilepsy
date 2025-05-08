import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function Index() {
  const router = useRouter();

  return (
    <View style={styles.background}>
      <Animated.View entering={FadeIn.duration(800)} style={styles.container}>
        <Image
          source={require('../assets/elogo.png')}
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
          onPress={() => router.push('/role')}
        >
          <Text style={styles.buttonTextC}>Create Account</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    position: 'absolute',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#F9F0FF',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  logo: {
    marginTop: 160,
    width: 200,
    height: 200,
    marginBottom: 5,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#2E3A59',
    marginBottom: 50,
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
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    borderWidth: 2,
    borderColor: '#4F46E5',
  },
  buttonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextC: {
    color: '#000',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
});
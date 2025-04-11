import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';

export default function ConnectDevice() {
  const [connecting, setConnecting] = useState(false);
  const router = useRouter();

  const handleConnect = () => {
    setConnecting(true);

    // Fake loading for 2 seconds
    setTimeout(() => {
      setConnecting(false);
      router.push('/home');
    }, 2000);
  };

  const handleSkip = () => {
    router.push('/home');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connect to Smartwatch</Text>

      <Text style={styles.subtitle}>
        Ready to connect your smartwatch for a better experience?
      </Text>

      {connecting ? (
        <>
          <ActivityIndicator size="large" color="#000" />
          <Text style={{ marginTop: 20 }}>Connecting...</Text>
        </>
      ) : (
        <>
          <TouchableOpacity style={styles.button} onPress={handleConnect}>
            <Text style={styles.buttonText}>Connect Smartwatch</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#000',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  skipButtonText: {
    color: 'grey',
    fontSize: 14,
  },
});
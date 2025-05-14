import React from 'react';
import {
  Text,
  StyleSheet,
  View,
  Linking,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Platform,
  KeyboardAvoidingView
} from 'react-native';

export default function InfoScreen() {
  const openLink = (url) => {
    Linking.openURL(url).catch(() => {
      alert('Unable to open link');
    });
  };

  // Platform-specific header height
  const HEADER_HEIGHT = Platform.OS === 'ios' ? 90 : 60;
  const CONTENT_MARGIN_TOP = HEADER_HEIGHT + 20;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        backgroundColor="#FFFFFF"
        barStyle="dark-content"
        translucent={Platform.OS === 'android'}
      />

      {/* Header */}
      <View style={[styles.headerContainer, { height: HEADER_HEIGHT }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>What is Epilepsy?</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingContainer}
        keyboardVerticalOffset={Platform.OS === "ios" ? HEADER_HEIGHT : 0}
      >
        <ScrollView
          style={[styles.container, { marginTop: CONTENT_MARGIN_TOP }]}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.paragraph}>
            Epilepsy is a neurological condition that affects the brain and causes recurring seizures. A seizure is a sudden surge of electrical activity in the brain that can cause changes in behavior, movements, feelings, and levels of consciousness.
          </Text>

          <Text style={styles.subtitle}>Types of Seizures</Text>
          <Text style={styles.paragraph}>
            Seizures vary widely. Some people may stare blankly for a few seconds, while others may have full-body convulsions. The two main types are:
          </Text>
          <Text style={styles.bullet}>• Focal seizures: Affect one part of the brain.</Text>
          <Text style={styles.bullet}>• Generalized seizures: Involve both sides of the brain.</Text>

          <Text style={styles.subtitle}>How to Support Someone</Text>
          <Text style={styles.paragraph}>
            If someone is having a seizure:
          </Text>
          <Text style={styles.bullet}>• Stay calm and stay with the person.</Text>
          <Text style={styles.bullet}>• Move dangerous objects away.</Text>
          <Text style={styles.bullet}>• Turn the person on their side if possible.</Text>
          <Text style={styles.bullet}>• Do not put anything in their mouth.</Text>
          <Text style={styles.bullet}>• Time the seizure and seek medical help if it lasts longer than 5 minutes.</Text>

          <Text style={styles.subtitle}>Helpful Resources</Text>
          <TouchableOpacity onPress={() => openLink('https://www.epilepsy.com')}>
            <Text style={styles.link}>• Epilepsy Foundation (epilepsy.com)</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openLink('https://www.who.int/news-room/fact-sheets/detail/epilepsy')}>
            <Text style={styles.link}>• World Health Organization: Epilepsy Overview</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openLink('https://www.nhs.uk/conditions/epilepsy/')}>
            <Text style={styles.link}>• NHS Guide to Epilepsy</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9F0FF',
  },
  headerContainer: {
    width: '100%',
    position: 'absolute',
    top: 0,
    zIndex: 10,
    paddingTop: Platform.OS === 'ios' ? 30 : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: '100%',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E3A59',
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    borderRadius: 20,
    marginHorizontal: 10,
    paddingTop: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#4F46E5',
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 5,
    color: '#2E3A59',
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 10,
    color: '#333',
  },
  bullet: {
    fontSize: 16,
    lineHeight: 24,
    marginLeft: 10,
    marginBottom: 5,
    color: '#333',
  },
  link: {
    fontSize: 16,
    color: '#1E90FF',
    marginBottom: 10,
    textDecorationLine: 'underline',
  },
});
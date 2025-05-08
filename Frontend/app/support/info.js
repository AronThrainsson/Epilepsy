import React from 'react';
import { ScrollView, Text, StyleSheet, View, Linking, TouchableOpacity } from 'react-native';

export default function InfoScreen() {
  const openLink = (url) => {
    Linking.openURL(url).catch(() => {
      alert('Unable to open link');
    });
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>What is Epilepsy?</Text>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginLeft: 10,
    marginRight: 10,
    marginTop: -25,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    paddingTop: 5,
    marginBottom: 10,
    color: '#4F46E5',
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 5,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 10,
  },
  bullet: {
    fontSize: 16,
    lineHeight: 24,
    marginLeft: 10,
    marginBottom: 5,
  },
  link: {
    fontSize: 16,
    color: '#1E90FF',
    marginBottom: 10,
  },
});
import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

export const DataEntryScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Data Entry</Text>
        <Text style={styles.subtitle}>Track your cycle data</Text>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>📝 Data entry interface coming soon</Text>
          <Text style={styles.featureText}>• Period flow tracking</Text>
          <Text style={styles.featureText}>• Symptom logging</Text>
          <Text style={styles.featureText}>• Mood tracking</Text>
          <Text style={styles.featureText}>• Notes and observations</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 30,
  },
  placeholder: {
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  placeholderText: {
    fontSize: 18,
    color: '#007AFF',
    marginBottom: 15,
    textAlign: 'center',
  },
  featureText: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 8,
    paddingLeft: 10,
  },
});

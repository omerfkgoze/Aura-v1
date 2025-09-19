import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

export const PredictionsScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Predictions</Text>
        <Text style={styles.subtitle}>AI-powered cycle insights</Text>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>🔮 Prediction engine coming soon</Text>
          <Text style={styles.featureText}>• Next period prediction</Text>
          <Text style={styles.featureText}>• Fertility window forecast</Text>
          <Text style={styles.featureText}>• Confidence intervals</Text>
          <Text style={styles.featureText}>• Uncertainty visualization</Text>
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

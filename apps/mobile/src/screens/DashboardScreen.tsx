import React from 'react';
import { SafeAreaView, View, StyleSheet } from 'react-native';
import { Text, Card } from '../components/ui';

export const DashboardScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text variant="heading" size="xxl">
            Dashboard
          </Text>
          <Text variant="caption" color="secondary">
            Your cycle overview
          </Text>
        </View>

        <Card variant="elevated">
          <View style={styles.cardContent}>
            <Text variant="subheading" color="primary">
              📊 Cycle insights coming soon
            </Text>
            <View style={styles.featureList}>
              <Text variant="body" color="secondary">
                • Next period prediction
              </Text>
              <Text variant="body" color="secondary">
                • Fertility window
              </Text>
              <Text variant="body" color="secondary">
                • Symptoms summary
              </Text>
            </View>
          </View>
        </Card>
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
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  cardContent: {
    alignItems: 'center',
  },
  featureList: {
    marginTop: 12,
  },
});

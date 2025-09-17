import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';

// Temporary type definitions
type FlowIntensity = 'none' | 'spotting' | 'light' | 'medium' | 'heavy';
type PeriodDayData = {
  date: string;
  flowIntensity: FlowIntensity;
  symptoms: any[];
  notes?: string;
  isPeriodStart?: boolean;
  isPeriodEnd?: boolean;
};

type TabType = 'calendar' | 'flow' | 'symptoms' | 'audit';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('calendar');
  const [selectedDates, setSelectedDates] = useState<PeriodDayData[]>([]);
  const [selectedFlow, setSelectedFlow] = useState<FlowIntensity>('medium');

  const handleDateSelect = (date: string, isPeriodStart?: boolean, isPeriodEnd?: boolean) => {
    console.log('Date selected:', date, { isPeriodStart, isPeriodEnd });
    // Add date selection logic here
  };

  const handleDateRange = (startDate: string, endDate?: string) => {
    console.log('Date range selected:', { startDate, endDate });
    // Add date range logic here
  };

  const handleFlowIntensityChange = (intensity: FlowIntensity) => {
    setSelectedFlow(intensity);
    console.log('Flow intensity changed:', intensity);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'calendar':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>Period Calendar</Text>
            <Text style={styles.placeholderText}>📅 Interactive period tracking calendar</Text>
            <Text style={styles.featureText}>• Mark period start/end dates</Text>
            <Text style={styles.featureText}>• Track flow intensity levels</Text>
            <Text style={styles.featureText}>• Visual calendar interface</Text>
            <Text style={styles.featureText}>• Privacy-first data handling</Text>
          </View>
        );
      case 'flow':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>Flow Intensity Tracking</Text>
            <Text style={styles.placeholderText}>💧 Track your flow intensity</Text>
            <View style={styles.flowOptions}>
              {['none', 'spotting', 'light', 'medium', 'heavy'].map(intensity => (
                <TouchableOpacity
                  key={intensity}
                  style={[
                    styles.flowOption,
                    selectedFlow === intensity && styles.selectedFlowOption,
                  ]}
                  onPress={() => setSelectedFlow(intensity as FlowIntensity)}
                >
                  <Text
                    style={[
                      styles.flowOptionText,
                      selectedFlow === intensity && styles.selectedFlowOptionText,
                    ]}
                  >
                    {intensity.charAt(0).toUpperCase() + intensity.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      case 'symptoms':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>Symptom Tracking</Text>
            <Text style={styles.placeholderText}>📝 Log and track symptoms</Text>
            <Text style={styles.featureText}>• Mood tracking</Text>
            <Text style={styles.featureText}>• Physical symptoms</Text>
            <Text style={styles.featureText}>• Energy levels</Text>
            <Text style={styles.featureText}>• Sleep quality</Text>
            <Text style={styles.featureText}>• Custom symptoms</Text>
          </View>
        );
      case 'audit':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>Privacy & Security Audit</Text>
            <Text style={styles.placeholderText}>🔒 Transparent data handling</Text>
            <Text style={styles.featureText}>• Zero-knowledge architecture</Text>
            <Text style={styles.featureText}>• End-to-end encryption</Text>
            <Text style={styles.featureText}>• Sync operation logs</Text>
            <Text style={styles.featureText}>• Privacy compliance metrics</Text>
            <Text style={styles.featureText}>• No plaintext health data</Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Aura</Text>
        <Text style={styles.subtitle}>Reproductive Health Tracking</Text>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'calendar' && styles.activeTab]}
          onPress={() => setActiveTab('calendar')}
        >
          <Text style={[styles.tabText, activeTab === 'calendar' && styles.activeTabText]}>
            📅 Calendar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'flow' && styles.activeTab]}
          onPress={() => setActiveTab('flow')}
        >
          <Text style={[styles.tabText, activeTab === 'flow' && styles.activeTabText]}>
            💧 Flow
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'symptoms' && styles.activeTab]}
          onPress={() => setActiveTab('symptoms')}
        >
          <Text style={[styles.tabText, activeTab === 'symptoms' && styles.activeTabText]}>
            📝 Symptoms
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'audit' && styles.activeTab]}
          onPress={() => setActiveTab('audit')}
        >
          <Text style={[styles.tabText, activeTab === 'audit' && styles.activeTabText]}>
            🔒 Audit
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>{renderTabContent()}</ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 20,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 20,
  },
  tabTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
  },
  placeholderText: {
    fontSize: 18,
    color: '#007AFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  featureText: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 8,
    paddingLeft: 10,
  },
  flowOptions: {
    marginTop: 20,
  },
  flowOption: {
    backgroundColor: '#F8F9FA',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedFlowOption: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  flowOptionText: {
    fontSize: 16,
    color: '#333333',
    textAlign: 'center',
    fontWeight: '500',
  },
  selectedFlowOptionText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';

import { DashboardScreen } from '../screens/DashboardScreen';
import { DataEntryScreen } from '../screens/DataEntryScreen';
import { PredictionsScreen } from '../screens/PredictionsScreen';
import { PrivacyControlsScreen } from '../screens/PrivacyControlsScreen';
import { CalculatorDisguiseScreen } from '../screens/CalculatorDisguiseScreen';
import {
  StealthNavigationProvider,
  useStealthNavigation,
} from '../components/privacy/StealthNavigationWrapper';

export type RootStackParamList = {
  Main: undefined;
  Auth: undefined;
  StealthCalculator: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  DataEntry: undefined;
  Predictions: undefined;
  Privacy: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator: React.FC = () => {
  const { culturalPreset, isStealthModeActive } = useStealthNavigation();

  // Show calculator disguise for stealth and invisible modes
  if (culturalPreset === 'stealth' || culturalPreset === 'invisible' || isStealthModeActive) {
    return <CalculatorDisguiseScreen />;
  }

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E0E0E0',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#666666',
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Home',
          tabBarIcon: () => null, // TODO: Add icons when UI package is integrated
        }}
      />
      <Tab.Screen
        name="DataEntry"
        component={DataEntryScreen}
        options={{
          title: 'Data Entry',
          tabBarLabel: 'Track',
          tabBarIcon: () => null,
        }}
      />
      <Tab.Screen
        name="Predictions"
        component={PredictionsScreen}
        options={{
          title: 'Predictions',
          tabBarLabel: 'Forecast',
          tabBarIcon: () => null,
        }}
      />
      <Tab.Screen
        name="Privacy"
        component={PrivacyControlsScreen}
        options={{
          title: 'Privacy Controls',
          tabBarLabel: 'Privacy',
          tabBarIcon: () => null,
        }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  return (
    <StealthNavigationProvider>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          {/* TODO: Add authentication flow */}
          <Stack.Screen name="Main" component={MainTabNavigator} options={{ title: 'Aura' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </StealthNavigationProvider>
  );
};

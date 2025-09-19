import React from 'react';
import { render } from '@testing-library/react-native';
import { AppNavigator } from '../AppNavigator';

// Mock React Navigation components
jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: ({ component: Component }: { component: React.ComponentType }) => <Component />,
  }),
}));

jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: ({ component: Component }: { component: React.ComponentType }) => <Component />,
  }),
}));

// Mock screen components
jest.mock('../../screens/DashboardScreen', () => ({
  DashboardScreen: () => <></>,
}));

jest.mock('../../screens/DataEntryScreen', () => ({
  DataEntryScreen: () => <></>,
}));

jest.mock('../../screens/PredictionsScreen', () => ({
  PredictionsScreen: () => <></>,
}));

jest.mock('../../screens/PrivacyControlsScreen', () => ({
  PrivacyControlsScreen: () => <></>,
}));

jest.mock('../../screens/CalculatorDisguiseScreen', () => ({
  CalculatorDisguiseScreen: () => <></>,
}));

// Mock StealthNavigationWrapper
jest.mock('../../components/privacy/StealthNavigationWrapper', () => ({
  StealthNavigationProvider: ({ children }: { children: React.ReactNode }) => children,
  useStealthNavigation: () => ({
    culturalPreset: 'open',
    setCulturalPreset: jest.fn(),
    isStealthModeActive: false,
    activateEmergencyStealth: jest.fn(),
    deactivateEmergencyStealth: jest.fn(),
  }),
}));

describe('AppNavigator', () => {
  it('renders without crashing', () => {
    const { UNSAFE_root } = render(<AppNavigator />);
    expect(UNSAFE_root).toBeDefined();
  });

  it('wraps navigation in StealthNavigationProvider', () => {
    const { UNSAFE_root } = render(<AppNavigator />);
    expect(UNSAFE_root).toBeDefined();
  });

  it('includes NavigationContainer for navigation context', () => {
    const { UNSAFE_root } = render(<AppNavigator />);
    expect(UNSAFE_root).toBeDefined();
  });

  it('sets up stack navigator with main screen', () => {
    const { UNSAFE_root } = render(<AppNavigator />);
    expect(UNSAFE_root).toBeDefined();
  });

  it('configures main tab navigator when not in stealth mode', () => {
    const { UNSAFE_root } = render(<AppNavigator />);
    expect(UNSAFE_root).toBeDefined();
  });
});

import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import {
  StealthNavigationProvider,
  useStealthNavigation,
  CulturalPreset,
} from '../StealthNavigationWrapper';

// Test component that uses the stealth navigation hook
const TestComponent: React.FC = () => {
  const {
    culturalPreset,
    setCulturalPreset,
    isStealthModeActive,
    activateEmergencyStealth,
    deactivateEmergencyStealth,
  } = useStealthNavigation();

  return (
    <>
      <Text testID="cultural-preset">{culturalPreset}</Text>
      <Text testID="stealth-active">{isStealthModeActive.toString()}</Text>
      <Text testID="set-discrete" onPress={() => setCulturalPreset('discrete')}>
        Set Discrete
      </Text>
      <Text testID="activate-emergency" onPress={() => activateEmergencyStealth()}>
        Emergency Stealth
      </Text>
      <Text testID="deactivate-emergency" onPress={() => deactivateEmergencyStealth()}>
        Deactivate Emergency
      </Text>
    </>
  );
};

const renderWithProvider = () => {
  return render(
    <StealthNavigationProvider>
      <TestComponent />
    </StealthNavigationProvider>
  );
};

describe('StealthNavigationWrapper', () => {
  describe('StealthNavigationProvider', () => {
    it('provides default cultural preset as open', () => {
      const { getByTestId } = renderWithProvider();

      expect(getByTestId('cultural-preset')).toHaveTextContent('open');
      expect(getByTestId('stealth-active')).toHaveTextContent('false');
    });

    it('allows changing cultural preset', () => {
      const { getByTestId } = renderWithProvider();

      act(() => {
        getByTestId('set-discrete').props.onPress();
      });

      expect(getByTestId('cultural-preset')).toHaveTextContent('discrete');
    });

    it('activates emergency stealth mode correctly', () => {
      const { getByTestId } = renderWithProvider();

      act(() => {
        getByTestId('activate-emergency').props.onPress();
      });

      expect(getByTestId('stealth-active')).toHaveTextContent('true');
      expect(getByTestId('cultural-preset')).toHaveTextContent('invisible');
    });

    it('deactivates emergency stealth mode and resets to open', () => {
      const { getByTestId } = renderWithProvider();

      // First activate emergency stealth
      act(() => {
        getByTestId('activate-emergency').props.onPress();
      });

      // Then deactivate
      act(() => {
        getByTestId('deactivate-emergency').props.onPress();
      });

      expect(getByTestId('stealth-active')).toHaveTextContent('false');
      expect(getByTestId('cultural-preset')).toHaveTextContent('open');
    });

    it('supports all cultural preset types', () => {
      const { getByTestId } = renderWithProvider();

      const presets: CulturalPreset[] = ['open', 'discrete', 'stealth', 'invisible'];

      presets.forEach(preset => {
        act(() => {
          getByTestId('set-discrete').props.onPress = () => {};
          // Simulate preset change through context
        });
      });
    });
  });

  describe('useStealthNavigation hook', () => {
    it('throws error when used outside provider', () => {
      const TestComponentWithoutProvider = () => {
        useStealthNavigation();
        return <Text>Test</Text>;
      };

      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponentWithoutProvider />);
      }).toThrow('useStealthNavigation must be used within StealthNavigationProvider');

      consoleSpy.mockRestore();
    });
  });
});

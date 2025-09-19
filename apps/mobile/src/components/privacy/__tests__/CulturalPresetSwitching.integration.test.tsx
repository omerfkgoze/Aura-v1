import React from 'react';
import { render, act } from '@testing-library/react-native';
import { View } from 'react-native';
import { StealthNavigationProvider, useStealthNavigation } from '../StealthNavigationWrapper';

// Mock components that would be affected by cultural preset changes
const MockMainTabNavigator: React.FC = () => {
  const { culturalPreset, isStealthModeActive } = useStealthNavigation();

  if (culturalPreset === 'stealth' || culturalPreset === 'invisible' || isStealthModeActive) {
    return <View testID="calculator-disguise" />;
  }

  return <View testID="main-tabs" />;
};

const CulturalPresetController: React.FC = () => {
  const {
    culturalPreset,
    setCulturalPreset,
    activateEmergencyStealth,
    deactivateEmergencyStealth,
  } = useStealthNavigation();

  return (
    <View>
      <View testID={`preset-${culturalPreset}`} />
      <View testID="set-open" onTouchEnd={() => setCulturalPreset('open')} />
      <View testID="set-discrete" onTouchEnd={() => setCulturalPreset('discrete')} />
      <View testID="set-stealth" onTouchEnd={() => setCulturalPreset('stealth')} />
      <View testID="set-invisible" onTouchEnd={() => setCulturalPreset('invisible')} />
      <View testID="emergency-stealth" onTouchEnd={() => activateEmergencyStealth()} />
      <View testID="deactivate-emergency" onTouchEnd={() => deactivateEmergencyStealth()} />
      <MockMainTabNavigator />
    </View>
  );
};

const TestApp: React.FC = () => {
  return (
    <StealthNavigationProvider>
      <CulturalPresetController />
    </StealthNavigationProvider>
  );
};

describe('Cultural Preset Switching Integration', () => {
  it('starts with open preset and shows main tabs', () => {
    const { getByTestId, queryByTestId } = render(<TestApp />);

    expect(getByTestId('preset-open')).toBeDefined();
    expect(getByTestId('main-tabs')).toBeDefined();
    expect(queryByTestId('calculator-disguise')).toBeNull();
  });

  it('switches from open to discrete and maintains main tabs', () => {
    const { getByTestId, queryByTestId } = render(<TestApp />);

    act(() => {
      getByTestId('set-discrete').props.onTouchEnd();
    });

    expect(getByTestId('preset-discrete')).toBeDefined();
    expect(getByTestId('main-tabs')).toBeDefined();
    expect(queryByTestId('calculator-disguise')).toBeNull();
  });

  it('switches to stealth mode and shows calculator disguise', () => {
    const { getByTestId, queryByTestId } = render(<TestApp />);

    act(() => {
      getByTestId('set-stealth').props.onTouchEnd();
    });

    expect(getByTestId('preset-stealth')).toBeDefined();
    expect(queryByTestId('main-tabs')).toBeNull();
    expect(getByTestId('calculator-disguise')).toBeDefined();
  });

  it('switches to invisible mode and shows calculator disguise', () => {
    const { getByTestId, queryByTestId } = render(<TestApp />);

    act(() => {
      getByTestId('set-invisible').props.onTouchEnd();
    });

    expect(getByTestId('preset-invisible')).toBeDefined();
    expect(queryByTestId('main-tabs')).toBeNull();
    expect(getByTestId('calculator-disguise')).toBeDefined();
  });

  it('activates emergency stealth from any preset', () => {
    const { getByTestId, queryByTestId } = render(<TestApp />);

    // Start with discrete mode
    act(() => {
      getByTestId('set-discrete').props.onTouchEnd();
    });

    // Activate emergency stealth
    act(() => {
      getByTestId('emergency-stealth').props.onTouchEnd();
    });

    expect(getByTestId('preset-invisible')).toBeDefined();
    expect(queryByTestId('main-tabs')).toBeNull();
    expect(getByTestId('calculator-disguise')).toBeDefined();
  });

  it('deactivates emergency stealth and returns to open', () => {
    const { getByTestId, queryByTestId } = render(<TestApp />);

    // Activate emergency stealth
    act(() => {
      getByTestId('emergency-stealth').props.onTouchEnd();
    });

    // Deactivate emergency stealth
    act(() => {
      getByTestId('deactivate-emergency').props.onTouchEnd();
    });

    expect(getByTestId('preset-open')).toBeDefined();
    expect(getByTestId('main-tabs')).toBeDefined();
    expect(queryByTestId('calculator-disguise')).toBeNull();
  });

  it('maintains UI consistency through multiple preset changes', () => {
    const { getByTestId, queryByTestId } = render(<TestApp />);

    const testSequence = [
      { preset: 'discrete', expectTabs: true },
      { preset: 'stealth', expectTabs: false },
      { preset: 'open', expectTabs: true },
      { preset: 'invisible', expectTabs: false },
      { preset: 'discrete', expectTabs: true },
    ];

    testSequence.forEach(({ preset, expectTabs }) => {
      act(() => {
        getByTestId(`set-${preset}`).props.onTouchEnd();
      });

      expect(getByTestId(`preset-${preset}`)).toBeDefined();

      if (expectTabs) {
        expect(getByTestId('main-tabs')).toBeDefined();
        expect(queryByTestId('calculator-disguise')).toBeNull();
      } else {
        expect(queryByTestId('main-tabs')).toBeNull();
        expect(getByTestId('calculator-disguise')).toBeDefined();
      }
    });
  });

  it('handles rapid preset switching without errors', () => {
    const { getByTestId } = render(<TestApp />);

    const presets = ['discrete', 'stealth', 'open', 'invisible', 'discrete'];

    // Rapid switching
    presets.forEach(preset => {
      act(() => {
        getByTestId(`set-${preset}`).props.onTouchEnd();
      });
    });

    // Should end up in discrete mode
    expect(getByTestId('preset-discrete')).toBeDefined();
    expect(getByTestId('main-tabs')).toBeDefined();
  });
});

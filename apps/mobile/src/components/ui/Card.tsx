import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';

interface CardProps extends ViewProps {
  variant?: 'default' | 'elevated' | 'outlined' | 'stealth';
  padding?: 'none' | 'small' | 'medium' | 'large';
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'medium',
  style,
  children,
  ...props
}) => {
  const getVariantStyle = () => {
    switch (variant) {
      case 'elevated':
        return styles.elevated;
      case 'outlined':
        return styles.outlined;
      case 'stealth':
        return styles.stealth;
      default:
        return styles.default;
    }
  };

  const getPaddingStyle = () => {
    switch (padding) {
      case 'none':
        return styles.paddingNone;
      case 'small':
        return styles.paddingSmall;
      case 'large':
        return styles.paddingLarge;
      default:
        return styles.paddingMedium;
    }
  };

  return (
    <View style={[styles.base, getVariantStyle(), getPaddingStyle(), style]} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 8,
    borderWidth: 1,
  },

  // Variants
  default: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E0E0E0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  elevated: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E0E0E0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  outlined: {
    backgroundColor: 'transparent',
    borderColor: '#E0E0E0',
    borderWidth: 1,
  },
  stealth: {
    backgroundColor: '#1C1C1E',
    borderColor: '#48484A',
    shadowColor: '#000000',
  },

  // Padding
  paddingNone: {
    padding: 0,
  },
  paddingSmall: {
    padding: 8,
  },
  paddingMedium: {
    padding: 16,
  },
  paddingLarge: {
    padding: 24,
  },
});

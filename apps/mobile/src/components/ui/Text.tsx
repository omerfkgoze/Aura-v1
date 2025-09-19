import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';

interface TextProps extends RNTextProps {
  variant?: 'heading' | 'subheading' | 'body' | 'caption' | 'label';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  color?: 'primary' | 'secondary' | 'muted' | 'success' | 'warning' | 'error' | 'stealth';
}

export const Text: React.FC<TextProps> = ({ variant = 'body', size, color, style, ...props }) => {
  const getVariantStyle = () => {
    switch (variant) {
      case 'heading':
        return styles.heading;
      case 'subheading':
        return styles.subheading;
      case 'caption':
        return styles.caption;
      case 'label':
        return styles.label;
      default:
        return styles.body;
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'xs':
        return styles.xs;
      case 'sm':
        return styles.sm;
      case 'lg':
        return styles.lg;
      case 'xl':
        return styles.xl;
      case 'xxl':
        return styles.xxl;
      default:
        return styles.md;
    }
  };

  const getColorStyle = () => {
    switch (color) {
      case 'primary':
        return styles.primaryColor;
      case 'secondary':
        return styles.secondaryColor;
      case 'muted':
        return styles.mutedColor;
      case 'success':
        return styles.successColor;
      case 'warning':
        return styles.warningColor;
      case 'error':
        return styles.errorColor;
      case 'stealth':
        return styles.stealthColor;
      default:
        return styles.defaultColor;
    }
  };

  return (
    <RNText
      style={[getVariantStyle(), size && getSizeStyle(), color && getColorStyle(), style]}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  // Variants
  heading: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 28,
  },
  subheading: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 24,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 20,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
    color: '#666666',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },

  // Sizes
  xs: {
    fontSize: 12,
    lineHeight: 16,
  },
  sm: {
    fontSize: 14,
    lineHeight: 18,
  },
  md: {
    fontSize: 16,
    lineHeight: 20,
  },
  lg: {
    fontSize: 18,
    lineHeight: 22,
  },
  xl: {
    fontSize: 20,
    lineHeight: 24,
  },
  xxl: {
    fontSize: 28,
    lineHeight: 32,
  },

  // Colors
  defaultColor: {
    color: '#333333',
  },
  primaryColor: {
    color: '#007AFF',
  },
  secondaryColor: {
    color: '#666666',
  },
  mutedColor: {
    color: '#999999',
  },
  successColor: {
    color: '#28A745',
  },
  warningColor: {
    color: '#FFC107',
  },
  errorColor: {
    color: '#DC3545',
  },
  stealthColor: {
    color: '#FFFFFF',
  },
});

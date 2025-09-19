import { createTamagui } from '@tamagui/core';
import { config } from '@tamagui/config/v3';

// Custom Aura color palette from UX Architecture
const auraColors = {
  primary: '#2E5266', // Primary blue-grey
  secondary: '#4A7C7E', // Secondary teal
  accent: '#E8B04B', // Accent amber
  background: '#F8FAFC', // Light background
  surface: '#FFFFFF', // Card surface
  text: '#1E293B', // Primary text
  textSecondary: '#64748B', // Secondary text
  border: '#E2E8F0', // Border color
  success: '#22C55E', // Success green
  warning: '#F59E0B', // Warning amber
  error: '#EF4444', // Error red
};

// Override config with Aura theme
const tamaguiConfig = createTamagui({
  ...config,
  themes: {
    ...config.themes,
    light: {
      ...config.themes.light,
      background: auraColors.background,
      backgroundHover: '#F1F5F9',
      backgroundPress: '#E2E8F0',
      backgroundFocus: '#F1F5F9',
      color: auraColors.text,
      colorHover: auraColors.text,
      colorPress: auraColors.text,
      colorFocus: auraColors.text,
      borderColor: auraColors.border,
      borderColorHover: '#CBD5E1',
      borderColorFocus: auraColors.primary,
      shadowColor: 'rgba(0, 0, 0, 0.1)',
      shadowColorHover: 'rgba(0, 0, 0, 0.15)',
      shadowColorPress: 'rgba(0, 0, 0, 0.2)',
      shadowColorFocus: 'rgba(0, 0, 0, 0.1)',
    },
    dark: {
      ...config.themes.dark,
      // Dark theme placeholder - can be extended later
      background: '#0F172A',
      color: '#F1F5F9',
    },
  },
  tokens: {
    ...config.tokens,
    color: {
      ...config.tokens.color,
      primary: auraColors.primary,
      secondary: auraColors.secondary,
      accent: auraColors.accent,
      success: auraColors.success,
      warning: auraColors.warning,
      error: auraColors.error,
    },
  },
});

export default tamaguiConfig;

export type Conf = typeof tamaguiConfig;

declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends Conf {}
}

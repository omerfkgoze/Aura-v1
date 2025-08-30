import { validateFrontendEnv, checkDevelopmentSecrets } from '@aura/utils';
import Constants from 'expo-constants';

// Get environment variables from Expo Constants (which includes .env.local)
const env = Constants.expoConfig?.extra || process.env;

// Validate and export frontend environment variables
export const frontendEnv = validateFrontendEnv(env);

// Development environment checking (only in development builds)
if (__DEV__) {
  const secretCheck = checkDevelopmentSecrets(env);
  
  if (secretCheck.missing.length > 0) {
    console.error('❌ Missing required environment variables:', secretCheck.missing.join(', '));
    console.error('📝 Copy .env.example to .env.local and fill in the values');
    // In mobile, we warn but don't exit as it might crash the app
  }
  
  if (secretCheck.insecure.length > 0) {
    console.warn('⚠️  Insecure environment variables detected:', secretCheck.insecure.join(', '));
    console.warn('🔐 Generate secure secrets using: pnpm nx run utils:generate-secrets');
  }
  
  if (secretCheck.warnings.length > 0) {
    console.info('ℹ️  Development warnings:', secretCheck.warnings.join(', '));
  }
  
  console.log('✅ Mobile environment variables validated successfully');
}

// Export config objects for the mobile app
export const supabaseConfig = {
  url: frontendEnv.EXPO_PUBLIC_SUPABASE_URL,
  anonKey: frontendEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY,
} as const;

export const apiConfig = {
  url: frontendEnv.EXPO_PUBLIC_API_URL,
} as const;

export const securityConfig = {
  devicePepper: frontendEnv.EXPO_PUBLIC_DEVICE_PEPPER,
  auditEnabled: frontendEnv.SECURITY_AUDIT_ENABLED,
} as const;

export const uxConfig = {
  culturalDetection: frontendEnv.EXPO_PUBLIC_CULTURAL_DETECTION_ENABLED,
  stealthModeDefault: frontendEnv.EXPO_PUBLIC_STEALTH_MODE_DEFAULT,
  paaEnabled: frontendEnv.EXPO_PUBLIC_ACCESSIBILITY_PAA_ENABLED,
  reducedMotion: frontendEnv.EXPO_PUBLIC_ANIMATION_REDUCED_MOTION,
} as const;

// App info from Expo config
export const appConfig = {
  name: Constants.expoConfig?.name || 'Aura',
  version: Constants.expoConfig?.version || frontendEnv.APP_VERSION,
  buildVersion: Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || '1',
} as const;
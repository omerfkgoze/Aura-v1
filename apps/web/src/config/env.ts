import { validateBackendEnv, validateFrontendEnv, checkDevelopmentSecrets } from '@aura/utils';

// Validate and export backend environment variables
export const backendEnv = validateBackendEnv(process.env);

// Validate and export frontend environment variables (for client-side use)
export const frontendEnv = validateFrontendEnv(process.env);

// Development environment checking
if (process.env['NODE_ENV'] === 'development') {
  const secretCheck = checkDevelopmentSecrets(process.env);

  if (secretCheck.missing.length > 0) {
    console.error('❌ Missing required environment variables:', secretCheck.missing.join(', '));
    console.error('📝 Copy .env.example to .env.local and fill in the values');
    process.exit(1);
  }

  if (secretCheck.insecure.length > 0) {
    console.warn('⚠️  Insecure environment variables detected:', secretCheck.insecure.join(', '));
    console.warn('🔐 Generate secure secrets using: pnpm nx run utils:generate-secrets');
  }

  if (secretCheck.warnings.length > 0) {
    console.info('ℹ️  Development warnings:', secretCheck.warnings.join(', '));
  }

  console.log('✅ Environment variables validated successfully');
}

// Export individual config objects for different parts of the app
export const supabaseConfig = {
  url: backendEnv.SUPABASE_URL,
  anonKey: frontendEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  serviceRoleKey: backendEnv.SUPABASE_SERVICE_ROLE_KEY,
} as const;

export const apiConfig = {
  url: frontendEnv.EXPO_PUBLIC_API_URL,
  corsOrigin: backendEnv.CORS_ORIGIN.split(',').map(origin => origin.trim()),
} as const;

export const securityConfig = {
  nextAuthSecret: backendEnv.NEXTAUTH_SECRET,
  devicePepper: frontendEnv.EXPO_PUBLIC_DEVICE_PEPPER,
  deviceHashPepper: backendEnv.DEVICE_HASH_PEPPER,
  auditEnabled: backendEnv.SECURITY_AUDIT_ENABLED,
} as const;

export const uxConfig = {
  culturalDetection: frontendEnv.EXPO_PUBLIC_CULTURAL_DETECTION_ENABLED,
  stealthModeDefault: frontendEnv.EXPO_PUBLIC_STEALTH_MODE_DEFAULT,
  paaEnabled: frontendEnv.EXPO_PUBLIC_ACCESSIBILITY_PAA_ENABLED,
  reducedMotion: frontendEnv.EXPO_PUBLIC_ANIMATION_REDUCED_MOTION,
} as const;

/**
 * Helper functions extracted from generate-secrets.js for testing
 * These functions contain the core logic without the side effects
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Generate all required secrets with appropriate encoding
 */
function generateSecrets() {
  return {
    EXPO_PUBLIC_DEVICE_PEPPER: crypto.randomBytes(48).toString('base64'),
    DEVICE_HASH_PEPPER: crypto.randomBytes(48).toString('base64'),
    NEXTAUTH_SECRET: crypto.randomBytes(48).toString('base64'),

    JWT_SECRET: crypto.randomBytes(32).toString('hex'),
    ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
    SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
  };
}

/**
 * Update an environment file with new secrets
 */
function updateEnvFile(filePath, examplePath, secrets) {
  let envContent = '';

  try {
    if (fs.existsSync(filePath)) {
      envContent = fs.readFileSync(filePath, 'utf8');
    } else if (fs.existsSync(examplePath)) {
      envContent = fs.readFileSync(examplePath, 'utf8');
    }
  } catch (error) {
    // Handle error gracefully, start with empty content
    console.log(`Warning: Could not read template for ${filePath}`);
  }

  // Update or add secrets in the content
  Object.entries(secrets).forEach(([key, value]) => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    const newLine = `${key}=${value}`;

    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, newLine);
    } else {
      envContent += envContent.endsWith('\n') ? '' : '\n';
      envContent += `${newLine}\n`;
    }
  });

  // Create directory if it doesn't exist
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  try {
    fs.writeFileSync(filePath, envContent);
  } catch (error) {
    console.log(`Error writing to ${filePath}: ${error.message}`);
    throw error;
  }
}

/**
 * Display secrets with truncation for security
 */
function displaySecrets(secrets) {
  console.log('✅ Generated secure secrets:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  Object.entries(secrets).forEach(([key, value]) => {
    const displayValue = value.length > 32 ? `${value.substring(0, 32)}...` : value;
    console.log(`${key}=${displayValue}`);
  });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('💡 To automatically update .env.local files, run:');
  console.log('   node scripts/generate-secrets.js --write\n');
}

/**
 * Get environment file paths
 */
function getEnvPaths() {
  const cwd = process.cwd();

  return {
    root: path.join(cwd, '.env.local'),
    web: path.join(cwd, 'apps/web/.env.local'),
    mobile: path.join(cwd, 'apps/mobile/.env.local'),
    rootExample: path.join(cwd, '.env.example'),
    webExample: path.join(cwd, 'apps/web/.env.example'),
    mobileExample: path.join(cwd, 'apps/mobile/.env.example'),
  };
}

/**
 * Validate secret strength
 */
function validateSecretStrength(secret, minLength = 32) {
  if (!secret || typeof secret !== 'string') {
    return { valid: false, reason: 'Secret must be a non-empty string' };
  }

  if (secret.length < minLength) {
    return { valid: false, reason: `Secret must be at least ${minLength} characters` };
  }

  // Check for placeholder values
  const placeholders = ['change-me', 'your-secret-here', 'placeholder', 'test-secret'];
  if (placeholders.some(placeholder => secret.toLowerCase().includes(placeholder))) {
    return { valid: false, reason: 'Secret appears to be a placeholder value' };
  }

  return { valid: true };
}

/**
 * Check if secrets meet security requirements
 */
function validateAllSecrets(secrets) {
  const results = {};
  const requiredSecrets = ['EXPO_PUBLIC_DEVICE_PEPPER', 'DEVICE_HASH_PEPPER', 'NEXTAUTH_SECRET'];

  // Check required secrets exist
  requiredSecrets.forEach(key => {
    if (!secrets[key]) {
      results[key] = { valid: false, reason: 'Required secret is missing' };
    } else {
      results[key] = validateSecretStrength(secrets[key]);
    }
  });

  // Check optional secrets if present
  Object.entries(secrets).forEach(([key, value]) => {
    if (!results[key]) {
      results[key] = validateSecretStrength(value);
    }
  });

  return results;
}

module.exports = {
  generateSecrets,
  updateEnvFile,
  displaySecrets,
  getEnvPaths,
  validateSecretStrength,
  validateAllSecrets,
};

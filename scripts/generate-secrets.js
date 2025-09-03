#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Generate secure secrets for Aura development environment
 * This script creates cryptographically secure random values for all required secrets
 */

console.log('🔐 Generating secure secrets for Aura development environment...\n');

// Generate secure random values
const secrets = {
  EXPO_PUBLIC_DEVICE_PEPPER: crypto.randomBytes(48).toString('base64'),
  DEVICE_HASH_PEPPER: crypto.randomBytes(48).toString('base64'),
  NEXTAUTH_SECRET: crypto.randomBytes(48).toString('base64'),

  // Additional secrets for future use
  JWT_SECRET: crypto.randomBytes(32).toString('hex'),
  ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
  SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
};

console.log('✅ Generated secure secrets:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Display generated secrets
Object.entries(secrets).forEach(([key, value]) => {
  const displayValue = value.length > 32 ? `${value.substring(0, 32)}...` : value;
  console.log(`${key}=${displayValue}`);
});

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Option to write to .env.local files
const envLocalPath = path.join(process.cwd(), '.env.local');
const webEnvLocalPath = path.join(process.cwd(), 'apps/web/.env.local');
const mobileEnvLocalPath = path.join(process.cwd(), 'apps/mobile/.env.local');

if (process.argv.includes('--write')) {
  console.log('📝 Writing secrets to .env.local files...\n');

  // Read existing .env.local files or create from examples
  const writeSecretsToEnvFile = (filePath, examplePath) => {
    let envContent = '';

    try {
      if (fs.existsSync(filePath)) {
        envContent = fs.readFileSync(filePath, 'utf8');
        console.log(`✅ Updating existing ${filePath}`);
      } else if (fs.existsSync(examplePath)) {
        envContent = fs.readFileSync(examplePath, 'utf8');
        console.log(`📋 Creating ${filePath} from ${examplePath}`);
      } else {
        console.log(`⚠️  No template found for ${filePath}, creating minimal version`);
      }
    } catch (error) {
      console.log(`⚠️  Could not read template for ${filePath}, creating minimal version`);
    }

    // Update or add secrets in the content
    Object.entries(secrets).forEach(([key, value]) => {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      const newLine = `${key}=${value}`;

      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, newLine);
      } else {
        // Add the secret at the end
        envContent += envContent.endsWith('\n') ? '' : '\n';
        envContent += `${newLine}\n`;
      }
    });

    // Write the updated content
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, envContent);
    console.log(`✅ Updated ${filePath}`);
  };

  // Update root .env.local
  writeSecretsToEnvFile(envLocalPath, '.env.example');

  // Update web app .env.local
  writeSecretsToEnvFile(webEnvLocalPath, 'apps/web/.env.example');

  // Update mobile app .env.local
  writeSecretsToEnvFile(mobileEnvLocalPath, 'apps/mobile/.env.example');

  console.log('\n🎉 All .env.local files updated with secure secrets!');
  console.log('⚠️  Remember to never commit .env.local files to git!\n');
} else {
  console.log('💡 To automatically update .env.local files, run:');
  console.log('   node scripts/generate-secrets.js --write\n');

  console.log('📋 Or copy these secrets manually to your .env.local files:');
  console.log('   - Root: .env.local');
  console.log('   - Web: apps/web/.env.local');
  console.log('   - Mobile: apps/mobile/.env.local\n');
}

// Security recommendations
console.log('🛡️  Security Recommendations:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('• Store these secrets securely and never commit them to git');
console.log('• Use different secrets for development, staging, and production');
console.log('• Rotate secrets regularly in production environments');
console.log('• Use environment variable management tools in production');
console.log('• Validate secrets are loaded correctly on application startup');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('✨ Secret generation completed successfully!');

#!/usr/bin/env node

/**
 * Service Integration Testing Script
 * Tests connectivity and configuration for all external services
 */

const https = require('https');
const { execSync } = require('child_process');
require('dotenv').config();

// ANSI colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

// Test results tracking
const testResults = {
  supabase: { status: 'pending', message: '' },
  sentry: { status: 'pending', message: '' },
  environment: { status: 'pending', message: '' },
  build: { status: 'pending', message: '' },
};

/**
 * Test Supabase connectivity and configuration
 */
async function testSupabase() {
  logInfo('Testing Supabase connection...');

  try {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      testResults.supabase = {
        status: 'error',
        message: 'Missing Supabase credentials in environment variables',
      };
      return;
    }

    // Test basic connectivity to Supabase
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    });

    if (response.ok) {
      testResults.supabase = {
        status: 'success',
        message: `Connected to ${supabaseUrl}`,
      };
      logSuccess(`Supabase connection successful`);
    } else {
      testResults.supabase = {
        status: 'error',
        message: `HTTP ${response.status}: ${response.statusText}`,
      };
    }
  } catch (error) {
    testResults.supabase = {
      status: 'error',
      message: error.message,
    };
  }
}

/**
 * Test Sentry configuration
 */
async function testSentry() {
  logInfo('Testing Sentry configuration...');

  try {
    const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

    if (!sentryDsn) {
      testResults.sentry = {
        status: 'warning',
        message: 'Sentry DSN not configured - error tracking disabled',
      };
      return;
    }

    // Parse Sentry DSN to test endpoint
    const dsnMatch = sentryDsn.match(/https:\/\/(.+)@(.+)\/(.+)/);
    if (!dsnMatch) {
      testResults.sentry = {
        status: 'error',
        message: 'Invalid Sentry DSN format',
      };
      return;
    }

    const [, key, host, projectId] = dsnMatch;
    const testUrl = `https://${host}/api/${projectId}/envelope/`;

    // Test Sentry endpoint accessibility
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
      },
      body: '{"test":true}', // Dummy data to test endpoint
    });

    // Sentry returns specific status codes
    if (response.status === 200 || response.status === 429 || response.status === 400) {
      testResults.sentry = {
        status: 'success',
        message: `Sentry endpoint accessible (${host})`,
      };
      logSuccess(`Sentry configuration valid`);
    } else {
      testResults.sentry = {
        status: 'error',
        message: `Sentry endpoint test failed: HTTP ${response.status}`,
      };
    }
  } catch (error) {
    testResults.sentry = {
      status: 'error',
      message: error.message,
    };
  }
}

/**
 * Test environment variables configuration
 */
function testEnvironmentVariables() {
  logInfo('Testing environment variables...');

  const requiredEnvVars = [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NODE_ENV',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    testResults.environment = {
      status: 'error',
      message: `Missing environment variables: ${missingVars.join(', ')}`,
    };
    return;
  }

  // Test for placeholder values
  const placeholderVars = [];
  if (process.env.EXPO_PUBLIC_SUPABASE_URL?.includes('YOUR_SUPABASE_PROJECT_URL_HERE')) {
    placeholderVars.push('EXPO_PUBLIC_SUPABASE_URL');
  }
  if (process.env.SUPABASE_URL?.includes('YOUR_SUPABASE_PROJECT_URL_HERE')) {
    placeholderVars.push('SUPABASE_URL');
  }

  if (placeholderVars.length > 0) {
    testResults.environment = {
      status: 'error',
      message: `Placeholder values detected: ${placeholderVars.join(', ')}`,
    };
    return;
  }

  testResults.environment = {
    status: 'success',
    message: 'All required environment variables configured',
  };
  logSuccess(`Environment variables configured correctly`);
}

/**
 * Test build system
 */
function testBuildSystem() {
  logInfo('Testing build system...');

  try {
    // Test if Nx is available and can list projects
    const output = execSync('npx nx show projects', { encoding: 'utf8', stdio: 'pipe' });

    if (output.includes('web') && output.includes('utils')) {
      testResults.build = {
        status: 'success',
        message: 'Nx build system configured correctly',
      };
      logSuccess(`Build system ready`);
    } else {
      testResults.build = {
        status: 'warning',
        message: 'Expected projects not found in Nx workspace',
      };
    }
  } catch (error) {
    testResults.build = {
      status: 'error',
      message: `Build system error: ${error.message}`,
    };
  }
}

/**
 * Print final test results
 */
function printResults() {
  log('\\n' + colors.bold + '📋 SERVICE INTEGRATION TEST RESULTS' + colors.reset);
  log('='.repeat(50));

  Object.entries(testResults).forEach(([service, result]) => {
    const statusIcon =
      result.status === 'success' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
    const serviceLabel = service.charAt(0).toUpperCase() + service.slice(1);

    log(`${statusIcon} ${serviceLabel}: ${result.message}`);
  });

  log('='.repeat(50));

  // Overall status
  const errorCount = Object.values(testResults).filter(r => r.status === 'error').length;
  const warningCount = Object.values(testResults).filter(r => r.status === 'warning').length;

  if (errorCount > 0) {
    logError(`${errorCount} critical errors found - deployment not recommended`);
    process.exit(1);
  } else if (warningCount > 0) {
    logWarning(`${warningCount} warnings found - review before deployment`);
  } else {
    logSuccess('All services configured correctly - ready for deployment');
  }
}

/**
 * Main execution function
 */
async function main() {
  log(colors.bold + '🔍 AURA SERVICE INTEGRATION TESTS' + colors.reset);
  log('Testing external service connectivity and configuration...\\n');

  // Run all tests
  testEnvironmentVariables();
  await testSupabase();
  await testSentry();
  testBuildSystem();

  // Print results
  printResults();
}

// Handle unhandled rejections
process.on('unhandledRejection', error => {
  logError(`Unhandled error: ${error.message}`);
  process.exit(1);
});

// Run tests
main().catch(error => {
  logError(`Test execution failed: ${error.message}`);
  process.exit(1);
});

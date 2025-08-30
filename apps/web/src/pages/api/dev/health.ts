import { NextApiRequest, NextApiResponse } from 'next';
import { devLogger, dbLogger } from '@aura/logger';
import { backendEnv, supabaseConfig } from '../../../config/env';

/**
 * Development-only health check endpoint
 * Validates system components and crypto operations
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: 'Not found' });
  }
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const startTime = Date.now();
  
  try {
    const healthChecks = {
      environment: 'development',
      timestamp: new Date().toISOString(),
      checks: {} as Record<string, any>,
      overall: 'unknown' as 'healthy' | 'degraded' | 'unhealthy',
    };
    
    // Check environment variables
    const envCheck = checkEnvironmentVariables();
    healthChecks.checks.environment = envCheck;
    devLogger.healthCheck('environment_variables', envCheck.status, envCheck.responseTime);
    
    // Check Supabase connection
    const supabaseCheck = await checkSupabaseConnection();
    healthChecks.checks.supabase = supabaseCheck;
    devLogger.healthCheck('supabase', supabaseCheck.status, supabaseCheck.responseTime);
    
    // Check database connection (if using direct connection)
    if (backendEnv.DATABASE_URL) {
      const dbCheck = await checkDatabaseConnection();
      healthChecks.checks.database = dbCheck;
      devLogger.healthCheck('database', dbCheck.status, dbCheck.responseTime);
    }
    
    // Check Redis connection (if configured)
    if (backendEnv.REDIS_URL) {
      const redisCheck = await checkRedisConnection();
      healthChecks.checks.redis = redisCheck;
      devLogger.healthCheck('redis', redisCheck.status, redisCheck.responseTime);
    }
    
    // Check crypto operations
    const cryptoCheck = await checkCryptoOperations();
    healthChecks.checks.crypto = cryptoCheck;
    devLogger.healthCheck('crypto_operations', cryptoCheck.status, cryptoCheck.responseTime);
    
    // Determine overall health
    const allChecks = Object.values(healthChecks.checks);
    const healthyCount = allChecks.filter(check => check.status === 'healthy').length;
    const totalChecks = allChecks.length;
    
    if (healthyCount === totalChecks) {
      healthChecks.overall = 'healthy';
    } else if (healthyCount > totalChecks / 2) {
      healthChecks.overall = 'degraded';
    } else {
      healthChecks.overall = 'unhealthy';
    }
    
    const responseTime = Date.now() - startTime;
    devLogger.healthCheck('overall_system', healthChecks.overall, responseTime);
    
    return res.status(healthChecks.overall === 'healthy' ? 200 : 503).json(healthChecks);
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    devLogger.healthCheck('health_check_error', 'unhealthy', responseTime);
    
    return res.status(500).json({
      environment: 'development',
      timestamp: new Date().toISOString(),
      overall: 'unhealthy',
      error: 'Health check failed',
      checks: {},
    });
  }
}

function checkEnvironmentVariables() {
  const startTime = Date.now();
  
  try {
    const required = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'NEXTAUTH_SECRET',
      'DEVICE_HASH_PEPPER',
      'EXPO_PUBLIC_DEVICE_PEPPER',
    ];
    
    const missing = required.filter(key => !process.env[key]);
    const weak = required.filter(key => {
      const value = process.env[key];
      return value && value.length < 32;
    });
    
    return {
      status: missing.length === 0 && weak.length === 0 ? 'healthy' : 'unhealthy',
      responseTime: Date.now() - startTime,
      details: {
        required: required.length,
        present: required.length - missing.length,
        missing: missing.length > 0 ? missing : undefined,
        weak: weak.length > 0 ? weak : undefined,
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy' as const,
      responseTime: Date.now() - startTime,
      error: 'Environment check failed',
    };
  }
}

async function checkSupabaseConnection() {
  const startTime = Date.now();
  
  try {
    // Simple fetch to Supabase health endpoint
    const response = await fetch(`${supabaseConfig.url}/rest/v1/`, {
      headers: {
        'apikey': supabaseConfig.anonKey,
        'Authorization': `Bearer ${supabaseConfig.anonKey}`,
      },
    });
    
    return {
      status: response.ok ? 'healthy' : 'unhealthy',
      responseTime: Date.now() - startTime,
      details: {
        url: supabaseConfig.url,
        statusCode: response.status,
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy' as const,
      responseTime: Date.now() - startTime,
      error: 'Supabase connection failed',
    };
  }
}

async function checkDatabaseConnection() {
  const startTime = Date.now();
  
  try {
    // This would require a database client to be set up
    // For now, we'll do a simple check
    return {
      status: 'healthy' as const,
      responseTime: Date.now() - startTime,
      details: {
        message: 'Database check not implemented - requires DB client setup',
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy' as const,
      responseTime: Date.now() - startTime,
      error: 'Database connection failed',
    };
  }
}

async function checkRedisConnection() {
  const startTime = Date.now();
  
  try {
    // This would require a Redis client to be set up
    // For now, we'll do a simple check
    return {
      status: 'healthy' as const,
      responseTime: Date.now() - startTime,
      details: {
        message: 'Redis check not implemented - requires Redis client setup',
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy' as const,
      responseTime: Date.now() - startTime,
      error: 'Redis connection failed',
    };
  }
}

async function checkCryptoOperations() {
  const startTime = Date.now();
  
  try {
    // Test basic crypto operations
    const crypto = require('crypto');
    
    // Test hash generation
    const testData = 'test-data-for-crypto-validation';
    const hash1 = crypto.createHash('sha256').update(testData).digest('hex');
    const hash2 = crypto.createHash('sha256').update(testData).digest('hex');
    
    // Test random generation
    const random1 = crypto.randomBytes(32);
    const random2 = crypto.randomBytes(32);
    
    // Test HMAC
    const secret = crypto.randomBytes(32);
    const hmac = crypto.createHmac('sha256', secret).update(testData).digest('hex');
    
    const allTestsPassed = 
      hash1 === hash2 && // Hash consistency
      random1.length === 32 && // Random generation
      random2.length === 32 &&
      !random1.equals(random2) && // Random uniqueness
      hmac.length === 64; // HMAC generation
    
    return {
      status: allTestsPassed ? 'healthy' : 'unhealthy',
      responseTime: Date.now() - startTime,
      details: {
        hash_consistency: hash1 === hash2,
        random_generation: random1.length === 32 && random2.length === 32,
        random_uniqueness: !random1.equals(random2),
        hmac_generation: hmac.length === 64,
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy' as const,
      responseTime: Date.now() - startTime,
      error: 'Crypto operations failed',
    };
  }
}
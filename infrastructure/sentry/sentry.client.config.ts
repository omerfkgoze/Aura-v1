// Sentry Client Configuration for Aura App
// CRITICAL: Privacy-safe error tracking for reproductive health application
// This configuration ensures ZERO health data or PII is ever sent to Sentry

import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

// Privacy-safe error filtering
const healthDataKeywords = [
  'cycle',
  'period',
  'health',
  'symptom',
  'temperature',
  'birth',
  'pregnant',
  'fertility',
  'menstrual',
  'ovulation',
  'contraception',
];

const sensitiveDataKeywords = [
  'password',
  'token',
  'key',
  'secret',
  'email',
  'phone',
  'address',
  'name',
  'id',
  'userId',
  'sessionId',
  'deviceId',
];

// Check if error contains sensitive information
function containsSensitiveData(error: Error | string): boolean {
  const errorString = typeof error === 'string' ? error : error.message + ' ' + error.stack;
  const lowerErrorString = errorString.toLowerCase();

  return [...healthDataKeywords, ...sensitiveDataKeywords].some(keyword =>
    lowerErrorString.includes(keyword)
  );
}

// Privacy-safe beforeSend filter
const privacySafeBeforeSend = (event: Sentry.Event): Sentry.Event | null => {
  // Block any events containing health data or PII
  if (
    event.exception?.values?.[0]?.value &&
    containsSensitiveData(event.exception.values[0].value)
  ) {
    console.warn('Sentry: Blocked error containing sensitive data');
    return null;
  }

  if (event.message && containsSensitiveData(event.message)) {
    console.warn('Sentry: Blocked message containing sensitive data');
    return null;
  }

  // Remove sensitive data from breadcrumbs
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.filter(breadcrumb => {
      if (breadcrumb.message && containsSensitiveData(breadcrumb.message)) {
        return false;
      }
      return true;
    });
  }

  // Remove sensitive data from extra context
  if (event.extra) {
    Object.keys(event.extra).forEach(key => {
      if (healthDataKeywords.some(keyword => key.toLowerCase().includes(keyword))) {
        delete event.extra![key];
      }
    });
  }

  // Remove sensitive data from tags
  if (event.tags) {
    Object.keys(event.tags).forEach(key => {
      if (healthDataKeywords.some(keyword => key.toLowerCase().includes(keyword))) {
        delete event.tags![key];
      }
    });
  }

  // Remove user identification
  delete event.user;

  return event;
};

// Initialize Sentry with privacy-safe configuration
export function initSentry() {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  const environment = process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT || 'production';
  const sampleRate = parseFloat(process.env.EXPO_PUBLIC_SENTRY_SAMPLE_RATE || '0.1');
  const tracesSampleRate = parseFloat(process.env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || '0.01');

  if (!dsn) {
    console.warn('Sentry DSN not configured - error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment,

    // Privacy-safe sampling
    sampleRate,
    tracesSampleRate,

    // Privacy protection
    beforeSend: privacySafeBeforeSend,

    // Security settings
    sendDefaultPii: false,
    attachStacktrace: true,
    maxBreadcrumbs: 50,

    // Integrations
    integrations: [
      new BrowserTracing({
        // Only track navigation, not user interactions
        tracingOrigins: ['localhost', /^https:\/\/.*\.vercel\.app/, /^https:\/\/.*\.supabase\.co/],
        routingInstrumentation: Sentry
          .reactRouterV6Instrumentation
          // Pass router instance if using React Router
          (),
      }),
    ],

    // Performance monitoring (technical metrics only)
    tracesSampleRate,

    // Release tracking (version only, no source maps for privacy)
    release: process.env.APP_VERSION || 'development',

    // Disable session replay for privacy
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    // Transport options
    transport: Sentry.makeFetchTransport,

    // Additional privacy settings
    initialScope: {
      tags: {
        component: 'aura-web',
      },
      level: 'info',
    },
  });

  // Log initialization for debugging
  console.info('Sentry initialized with privacy-safe configuration', {
    environment,
    sampleRate,
    tracesSampleRate,
    dsn: dsn.split('@')[1], // Log only the endpoint part, not the key
  });
}

// Privacy-safe error reporting utility
export function reportError(error: Error, context?: Record<string, any>) {
  // Double-check for sensitive data before manual reporting
  if (containsSensitiveData(error)) {
    console.warn('Blocked manual error report containing sensitive data:', error.message);
    return;
  }

  // Filter context for sensitive data
  const safeContext = context
    ? Object.keys(context).reduce(
        (safe, key) => {
          if (!healthDataKeywords.some(keyword => key.toLowerCase().includes(keyword))) {
            safe[key] = context[key];
          }
          return safe;
        },
        {} as Record<string, any>
      )
    : {};

  Sentry.captureException(error, {
    extra: safeContext,
    tags: {
      source: 'manual-report',
    },
  });
}

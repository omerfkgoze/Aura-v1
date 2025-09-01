import * as Sentry from '@sentry/nextjs';

// Privacy-Safe Sentry Configuration for Reproductive Health App
// CRITICAL: This config ensures ZERO health data exposure in error reports

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Privacy-first error capture settings
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Completely disable session replay for privacy
  replaysSessionSampleRate: 0.0,
  replaysOnErrorSampleRate: 0.0,

  environment: process.env.NODE_ENV || 'development',

  // Data scrubbing configuration
  beforeSend(event, hint) {
    // Remove any potentially sensitive data
    return sanitizeEvent(event);
  },

  beforeSendTransaction(event) {
    // Sanitize transaction data
    return sanitizeTransaction(event);
  },

  // Enhanced data scrubbing
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Console(),
    new Sentry.Integrations.GlobalHandlers({
      onunhandledrejection: true,
      onerror: true,
    }),
  ],

  // Disable automatic breadcrumbs that might capture sensitive data
  defaultIntegrations: false,

  // Custom integrations with privacy filters
  integrations: [
    new Sentry.Integrations.InboundFilters({
      allowUrls: [
        // Only allow errors from our domains
        /https:\/\/(?:.*\.)?aura\.app/,
        /https:\/\/(?:.*\.)?vercel\.app/,
      ],
    }),
    new Sentry.Integrations.FunctionToString(),
    new Sentry.Integrations.LinkedErrors(),
    new Sentry.Integrations.UserAgent(),
  ],

  // Additional privacy settings
  initialScope: {
    tags: {
      component: 'web-client',
    },
  },
});

/**
 * Sanitizes Sentry events to prevent PII exposure
 */
function sanitizeEvent(event: Sentry.Event): Sentry.Event | null {
  if (!event) return null;

  // Remove user-identifiable information
  delete event.user;

  // Sanitize request data
  if (event.request) {
    // Remove sensitive headers
    if (event.request.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
      delete event.request.headers['x-user-id'];
    }

    // Remove query parameters and body data
    delete event.request.query_string;
    delete event.request.data;

    // Sanitize URL parameters
    if (event.request.url) {
      event.request.url = sanitizeUrl(event.request.url);
    }
  }

  // Sanitize exception data
  if (event.exception?.values) {
    event.exception.values = event.exception.values.map(exception => ({
      ...exception,
      value: sanitizeErrorMessage(exception.value || ''),
    }));
  }

  // Remove sensitive context data
  if (event.contexts) {
    delete event.contexts.user;
    delete event.contexts.session;
  }

  // Sanitize extra data
  if (event.extra) {
    event.extra = sanitizeExtraData(event.extra);
  }

  // Remove breadcrumbs that might contain sensitive data
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.filter(
      breadcrumb => !containsSensitiveData(breadcrumb.message || '')
    );
  }

  return event;
}

/**
 * Sanitizes transaction events
 */
function sanitizeTransaction(event: Sentry.Transaction): Sentry.Transaction | null {
  if (!event) return null;

  // Remove user context
  delete event.user;

  // Sanitize transaction name
  if (event.transaction) {
    event.transaction = sanitizeTransactionName(event.transaction);
  }

  return event;
}

/**
 * Removes sensitive data from URLs
 */
function sanitizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);

    // Remove all query parameters (might contain sensitive data)
    urlObj.search = '';

    // Replace sensitive path segments
    urlObj.pathname = urlObj.pathname.replace(/\/user\/[^\/]+/g, '/user/[ID]');

    return urlObj.toString();
  } catch {
    return '[SANITIZED_URL]';
  }
}

/**
 * Sanitizes error messages
 */
function sanitizeErrorMessage(message: string): string {
  if (!message) return message;

  // Remove common sensitive patterns
  return message
    .replace(/email:\s*[^\s,}]+/gi, 'email: [REDACTED]')
    .replace(/token:\s*[^\s,}]+/gi, 'token: [REDACTED]')
    .replace(/key:\s*[^\s,}]+/gi, 'key: [REDACTED]')
    .replace(/password:\s*[^\s,}]+/gi, 'password: [REDACTED]')
    .replace(/user_id:\s*[^\s,}]+/gi, 'user_id: [REDACTED]')
    .replace(/\b[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL_REDACTED]')
    .replace(/\b[A-Za-z0-9]{20,}/g, '[TOKEN_REDACTED]');
}

/**
 * Sanitizes extra data object
 */
function sanitizeExtraData(extra: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(extra)) {
    // Skip sensitive keys
    if (isSensitiveKey(key)) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    // Sanitize string values
    if (typeof value === 'string') {
      sanitized[key] = sanitizeErrorMessage(value);
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize objects (with depth limit)
      sanitized[key] = sanitizeObjectShallow(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Checks if a key is sensitive
 */
function isSensitiveKey(key: string): boolean {
  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'key',
    'auth',
    'session',
    'user_id',
    'email',
    'phone',
    'ssn',
    'credit',
    'card',
    'cycle',
    'period',
    'symptom',
    'health',
    'medical',
    'reproductive',
  ];

  return sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive));
}

/**
 * Shallow object sanitization
 */
function sanitizeObjectShallow(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => (typeof item === 'string' ? sanitizeErrorMessage(item) : '[REDACTED]'));
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveKey(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeErrorMessage(value);
    } else {
      sanitized[key] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Checks if content contains sensitive data
 */
function containsSensitiveData(content: string): boolean {
  if (!content) return false;

  const sensitivePatterns = [
    /\b[\w.-]+@[\w.-]+\.\w+/, // Email addresses
    /\b[A-Za-z0-9]{20,}/, // Long tokens/keys
    /password|token|secret|key/i,
    /cycle|period|symptom|health|medical/i,
  ];

  return sensitivePatterns.some(pattern => pattern.test(content));
}

/**
 * Sanitizes transaction names
 */
function sanitizeTransactionName(name: string): string {
  return name.replace(/\/user\/[^\/]+/g, '/user/[ID]');
}

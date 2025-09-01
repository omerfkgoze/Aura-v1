import * as Sentry from '@sentry/nextjs';

// Privacy-Safe Sentry Configuration for Server-Side
// CRITICAL: This config ensures ZERO health data exposure in server error reports

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Server-side sampling (lower rate for production)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,

  environment: process.env.NODE_ENV || 'development',

  // Completely disable session replay
  replaysSessionSampleRate: 0.0,
  replaysOnErrorSampleRate: 0.0,

  // Data scrubbing configuration
  beforeSend(event, hint) {
    return sanitizeServerEvent(event);
  },

  beforeSendTransaction(event) {
    return sanitizeServerTransaction(event);
  },

  // Server-specific integrations
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.OnUncaughtException(),
    new Sentry.Integrations.OnUnhandledRejection(),
    new Sentry.Integrations.InboundFilters({
      allowUrls: [
        // Only allow errors from our server endpoints
        /https:\/\/(?:.*\.)?aura\.app\/api/,
        /https:\/\/(?:.*\.)?vercel\.app\/api/,
      ],
    }),
  ],

  // Enhanced server privacy settings
  initialScope: {
    tags: {
      component: 'api-server',
    },
  },

  // Disable automatic collection of sensitive server data
  skipOpenTelemetrySetup: true,
});

/**
 * Sanitizes server-side Sentry events
 */
function sanitizeServerEvent(event: Sentry.Event): Sentry.Event | null {
  if (!event) return null;

  // Remove all user information (critical for health app)
  delete event.user;

  // Sanitize server request data
  if (event.request) {
    // Remove all headers (may contain auth tokens)
    delete event.request.headers;

    // Remove request body and query data
    delete event.request.data;
    delete event.request.query_string;

    // Sanitize URL
    if (event.request.url) {
      event.request.url = sanitizeServerUrl(event.request.url);
    }

    // Keep only safe request metadata
    event.request = {
      method: event.request.method,
      url: event.request.url,
    };
  }

  // Sanitize exception stack traces
  if (event.exception?.values) {
    event.exception.values = event.exception.values.map(exception => ({
      ...exception,
      value: sanitizeServerError(exception.value || ''),
      stacktrace: sanitizeStackTrace(exception.stacktrace),
    }));
  }

  // Remove server context that might contain sensitive data
  if (event.contexts) {
    delete event.contexts.user;
    delete event.contexts.session;
    delete event.contexts.runtime;

    // Keep only essential context
    if (event.contexts.os) {
      event.contexts.os = {
        name: event.contexts.os.name,
        version: '[REDACTED]',
      };
    }
  }

  // Sanitize extra data
  if (event.extra) {
    event.extra = sanitizeServerExtra(event.extra);
  }

  // Remove sensitive breadcrumbs
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs
      .filter(breadcrumb => !isServerSensitiveBreadcrumb(breadcrumb))
      .map(breadcrumb => ({
        ...breadcrumb,
        message: sanitizeServerError(breadcrumb.message || ''),
        data: undefined, // Remove all breadcrumb data
      }));
  }

  return event;
}

/**
 * Sanitizes server transaction events
 */
function sanitizeServerTransaction(event: Sentry.Transaction): Sentry.Transaction | null {
  if (!event) return null;

  // Remove user context
  delete event.user;

  // Sanitize transaction name
  if (event.transaction) {
    event.transaction = sanitizeServerTransactionName(event.transaction);
  }

  // Remove sensitive spans
  if (event.spans) {
    event.spans = event.spans
      .filter(span => !isServerSensitiveSpan(span))
      .map(span => ({
        ...span,
        description: sanitizeServerError(span.description || ''),
        data: undefined, // Remove all span data
      }));
  }

  return event;
}

/**
 * Sanitizes server URLs
 */
function sanitizeServerUrl(url: string): string {
  try {
    const urlObj = new URL(url);

    // Remove all query parameters
    urlObj.search = '';

    // Replace sensitive path segments
    urlObj.pathname = urlObj.pathname
      .replace(/\/api\/user\/[^\/]+/g, '/api/user/[ID]')
      .replace(/\/api\/cycle\/[^\/]+/g, '/api/cycle/[ID]')
      .replace(/\/api\/health\/[^\/]+/g, '/api/health/[ID]')
      .replace(/\/[a-f0-9-]{36}/g, '/[UUID]')
      .replace(/\/\d{4,}/g, '/[ID]');

    return urlObj.toString();
  } catch {
    return '/api/[SANITIZED]';
  }
}

/**
 * Sanitizes server error messages with health-specific patterns
 */
function sanitizeServerError(message: string): string {
  if (!message) return message;

  return (
    message
      // Database query sanitization
      .replace(/WHERE\s+user_id\s*=\s*'[^']+'/gi, "WHERE user_id = '[REDACTED]'")
      .replace(/SET\s+\w+\s*=\s*'[^']+'/gi, "SET [FIELD] = '[REDACTED]'")

      // Auth token sanitization
      .replace(/Bearer\s+[^\s]+/gi, 'Bearer [TOKEN_REDACTED]')
      .replace(/token[:\s=]+[^\s,}]+/gi, 'token: [REDACTED]')

      // Health data patterns
      .replace(/cycle_data[:\s=]+[^\s,}]+/gi, 'cycle_data: [REDACTED]')
      .replace(/symptom[:\s=]+[^\s,}]+/gi, 'symptom: [REDACTED]')
      .replace(/temperature[:\s=]+[^\s,}]+/gi, 'temperature: [REDACTED]')
      .replace(/mood[:\s=]+[^\s,}]+/gi, 'mood: [REDACTED]')

      // General PII patterns
      .replace(/user_id[:\s=]+[^\s,}]+/gi, 'user_id: [REDACTED]')
      .replace(/email[:\s=]+[^\s,}]+/gi, 'email: [REDACTED]')
      .replace(/\b[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL_REDACTED]')
      .replace(/\b[A-Za-z0-9]{20,}/g, '[TOKEN_REDACTED]')

      // Database connection strings
      .replace(/postgresql:\/\/[^\s]+/g, 'postgresql://[REDACTED]')
      .replace(/supabase\.co\/[^\s]+/g, 'supabase.co/[PROJECT_REDACTED]')
  );
}

/**
 * Sanitizes server extra data
 */
function sanitizeServerExtra(extra: Record<string, any>): Record<string, any> {
  const sensitiveKeys = [
    // Auth and user data
    'user',
    'user_id',
    'auth',
    'token',
    'session',
    'password',
    'secret',
    'key',
    // Health data
    'cycle',
    'period',
    'symptom',
    'temperature',
    'mood',
    'health',
    'medical',
    // Database data
    'query',
    'params',
    'body',
    'payload',
    'data',
    // System data
    'env',
    'environment',
    'config',
  ];

  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(extra)) {
    const keyLower = key.toLowerCase();
    const isSensitive = sensitiveKeys.some(sensitive => keyLower.includes(sensitive));

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeServerError(value);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    } else {
      sanitized[key] = '[OBJECT_REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Sanitizes stack traces
 */
function sanitizeStackTrace(stacktrace: any): any {
  if (!stacktrace?.frames) return stacktrace;

  return {
    ...stacktrace,
    frames: stacktrace.frames.map((frame: any) => ({
      ...frame,
      vars: undefined, // Remove all local variables
      pre_context: undefined,
      post_context: undefined,
      context_line: frame.context_line ? sanitizeServerError(frame.context_line) : undefined,
    })),
  };
}

/**
 * Checks if a breadcrumb contains server-sensitive data
 */
function isServerSensitiveBreadcrumb(breadcrumb: any): boolean {
  if (!breadcrumb.message) return false;

  const sensitivePatterns = [
    /SELECT.*FROM.*WHERE/i, // SQL queries
    /INSERT.*INTO/i,
    /UPDATE.*SET/i,
    /DELETE.*FROM/i,
    /cycle_data|symptom|temperature|mood/i, // Health data
    /user_id|auth|token|session/i, // User data
  ];

  return sensitivePatterns.some(pattern => pattern.test(breadcrumb.message));
}

/**
 * Checks if a transaction span contains sensitive data
 */
function isServerSensitiveSpan(span: any): boolean {
  if (!span.description) return false;

  return (
    span.op === 'db.query' || // All database operations
    span.description.includes('cycle_data') ||
    span.description.includes('user_id') ||
    span.description.includes('auth')
  );
}

/**
 * Sanitizes server transaction names
 */
function sanitizeServerTransactionName(name: string): string {
  return name
    .replace(/\/api\/user\/[^\/]+/g, '/api/user/[ID]')
    .replace(/\/api\/cycle\/[^\/]+/g, '/api/cycle/[ID]')
    .replace(/\/api\/health\/[^\/]+/g, '/api/health/[ID]');
}

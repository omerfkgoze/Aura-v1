import * as Sentry from '@sentry/nextjs';

// Privacy-Safe Sentry Configuration for Edge Runtime
// CRITICAL: Minimal config for edge functions with zero health data exposure

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Minimal sampling for edge functions
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.01 : 0.1,

  environment: process.env.NODE_ENV || 'development',

  // No session replay for edge
  replaysSessionSampleRate: 0.0,
  replaysOnErrorSampleRate: 0.0,

  // Maximum data sanitization for edge
  beforeSend(event) {
    return sanitizeEdgeEvent(event);
  },

  // Minimal integrations for edge runtime
  integrations: [new Sentry.Integrations.InboundFilters()],

  initialScope: {
    tags: {
      component: 'edge-runtime',
    },
  },
});

/**
 * Aggressive sanitization for edge events
 */
function sanitizeEdgeEvent(event: Sentry.Event): Sentry.Event | null {
  if (!event) return null;

  // Remove ALL user data
  delete event.user;
  delete event.request;
  delete event.contexts;
  delete event.breadcrumbs;
  delete event.extra;

  // Keep only essential error information
  if (event.exception?.values) {
    event.exception.values = event.exception.values.map(exception => ({
      type: exception.type,
      value: '[SANITIZED_ERROR]',
    }));
  }

  return event;
}

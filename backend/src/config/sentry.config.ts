/**
 * Sentry Configuration for Backend
 * Error tracking and performance monitoring
 */

import * as Sentry from '@sentry/node';
import { Express, RequestHandler, ErrorRequestHandler } from 'express';

// Environment variables
const SENTRY_DSN = process.env.SENTRY_DSN;
const ENVIRONMENT = process.env.NODE_ENV || 'development';
const RELEASE = process.env.RELEASE_VERSION || 'unknown';

/**
 * Initialize Sentry for the backend application
 */
export function initSentry(app: Express): void {
  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not configured. Error tracking is disabled.');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    release: `peoplebooster-backend@${RELEASE}`,
    
    // Performance Monitoring
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,

    // Filter sensitive data
    beforeSend(event: Sentry.ErrorEvent, hint: Sentry.EventHint) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
        delete event.request.headers['x-api-key'];
      }

      // Remove sensitive data from request body
      if (event.request?.data) {
        const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard'];
        try {
          const data = typeof event.request.data === 'string' 
            ? JSON.parse(event.request.data) 
            : event.request.data;
          
          sensitiveFields.forEach(field => {
            if (data[field]) {
              data[field] = '[REDACTED]';
            }
          });
          
          event.request.data = JSON.stringify(data);
        } catch {
          // Ignore JSON parse errors
        }
      }

      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      // Ignore common client errors
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      // Ignore authentication errors (handled separately)
      'UnauthorizedError',
      'TokenExpiredError',
    ],

    // Additional context
    initialScope: {
      tags: {
        service: 'backend',
        version: RELEASE,
      },
    },
  });

  // Setup Express error handler
  Sentry.setupExpressErrorHandler(app);

  console.log(`Sentry initialized for ${ENVIRONMENT} environment`);
}

/**
 * Sentry request handler middleware
 * Must be the first middleware
 */
export const sentryRequestHandler: RequestHandler = (req, res, next) => {
  // Add request context to Sentry
  Sentry.setContext('request', {
    method: req.method,
    url: req.url,
    headers: {
      'user-agent': req.headers['user-agent'],
      'content-type': req.headers['content-type'],
    },
  });
  next();
};

/**
 * Sentry tracing handler middleware
 * Must be after request handler
 */
export const sentryTracingHandler: RequestHandler = (req, res, next) => {
  next();
};

/**
 * Sentry error handler middleware
 * Must be before other error handlers
 */
export const sentryErrorHandler: ErrorRequestHandler = (error, req, res, next) => {
  // Report all 5xx errors
  const status = error.status || error.statusCode || 500;
  if (status >= 500 || status === 429) {
    Sentry.captureException(error);
  }
  next(error);
};

/**
 * Set user context for Sentry
 */
export function setSentryUser(user: { id: string; email?: string; role?: string }): void {
  Sentry.setUser({
    id: user.id,
    email: user.email,
  });
  if (user.role) {
    Sentry.setTag('user.role', user.role);
  }
}

/**
 * Clear user context
 */
export function clearSentryUser(): void {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for tracking user actions
 */
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>,
  level: Sentry.SeverityLevel = 'info'
): void {
  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Capture exception with additional context
 */
export function captureException(
  error: Error,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    user?: { id: string; email?: string };
  }
): string {
  return Sentry.captureException(error, {
    tags: context?.tags,
    extra: context?.extra,
    user: context?.user,
  });
}

/**
 * Capture message with severity level
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, unknown>
): string {
  return Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Start a span for performance monitoring
 */
export function startSpan(
  name: string,
  op: string
): Sentry.Span | undefined {
  return Sentry.startInactiveSpan({
    name,
    op,
  });
}

/**
 * Flush Sentry events before shutdown
 */
export async function flushSentry(timeout = 2000): Promise<boolean> {
  return Sentry.close(timeout);
}

export { Sentry };

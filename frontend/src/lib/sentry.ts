/**
 * Sentry Configuration for Frontend
 * Error tracking and performance monitoring
 */

import * as Sentry from '@sentry/nextjs';

// Environment variables
const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const ENVIRONMENT = process.env.NODE_ENV || 'development';
const RELEASE = process.env.NEXT_PUBLIC_RELEASE_VERSION || 'unknown';

/**
 * Initialize Sentry for the frontend application
 */
export function initSentry(): void {
  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not configured. Error tracking is disabled.');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    release: `peoplebooster-frontend@${RELEASE}`,

    // Performance Monitoring
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
    
    // Session Replay
    replaysSessionSampleRate: ENVIRONMENT === 'production' ? 0.1 : 0,
    replaysOnErrorSampleRate: 1.0,

    // Filter sensitive data
    beforeSend(event, hint) {
      // Remove sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
          if (breadcrumb.data) {
            const sensitiveKeys = ['password', 'token', 'apiKey', 'secret'];
            sensitiveKeys.forEach(key => {
              if (breadcrumb.data && (breadcrumb.data as Record<string, unknown>)[key]) {
                (breadcrumb.data as Record<string, unknown>)[key] = '[REDACTED]';
              }
            });
          }
          return breadcrumb;
        });
      }

      // Filter out chunk load errors (common in SPA)
      const error = hint.originalException;
      if (error instanceof Error) {
        if (error.message.includes('Loading chunk')) {
          return null;
        }
        if (error.message.includes('Loading CSS chunk')) {
          return null;
        }
      }

      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      // Random plugins/extensions
      'top.GLOBALS',
      // Chrome extensions
      'chrome-extension://',
      // Firefox extensions
      'moz-extension://',
      // Network errors
      'Network request failed',
      'Failed to fetch',
      'NetworkError',
      // User cancelled
      'AbortError',
      // Safari specific
      'webkit-masked-url://',
    ],

    // Deny URLs
    denyUrls: [
      // Chrome extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      // Firefox extensions
      /^moz-extension:\/\//i,
    ],
  });

  console.log(`Sentry initialized for ${ENVIRONMENT} environment`);
}

/**
 * Set user context for Sentry
 */
export function setSentryUser(user: {
  id: string;
  email?: string;
  role?: string;
  companyId?: string;
}): void {
  Sentry.setUser({
    id: user.id,
    email: user.email,
  });
  if (user.role) {
    Sentry.setTag('user.role', user.role);
  }
  if (user.companyId) {
    Sentry.setTag('user.companyId', user.companyId);
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
  }
): string {
  return Sentry.captureException(error, {
    tags: context?.tags,
    extra: context?.extra,
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
 * Track user interaction
 */
export function trackInteraction(
  action: string,
  category: string,
  label?: string,
  value?: number
): void {
  addBreadcrumb('user-interaction', `${action} - ${category}`, {
    label,
    value,
  });
}

/**
 * Track page view
 */
export function trackPageView(pageName: string, properties?: Record<string, unknown>): void {
  addBreadcrumb('navigation', `Page view: ${pageName}`, properties);
}

/**
 * Create error boundary fallback component props
 */
export function getErrorBoundaryProps() {
  return {
    fallback: ({ error, resetError }: { error: Error; resetError: () => void }) => ({
      error,
      resetError,
    }),
    onError: (error: Error, componentStack: string) => {
      captureException(error, {
        extra: { componentStack },
        tags: { type: 'react-error-boundary' },
      });
    },
  };
}

export { Sentry };

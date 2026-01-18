/**
 * Sentry Server Configuration
 * This file configures the initialization of Sentry on the server.
 * The config you add here will be used whenever the server handles a request.
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  environment: process.env.NODE_ENV || 'development',
  release: process.env.NEXT_PUBLIC_RELEASE_VERSION 
    ? `peoplebooster-frontend@${process.env.NEXT_PUBLIC_RELEASE_VERSION}` 
    : undefined,

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Debug mode for development
  debug: process.env.NODE_ENV === 'development',
});

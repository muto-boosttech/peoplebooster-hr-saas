/**
 * Health Check Service
 * Monitors the health of all system components
 */

import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();

// Redis client (lazy initialization)
let redisClient: Redis | null = null;

function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      lazyConnect: true,
    });
  }
  return redisClient;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: ComponentHealth;
    redis: ComponentHealth;
    externalServices: ExternalServicesHealth;
  };
}

export interface ComponentHealth {
  status: 'healthy' | 'unhealthy';
  latency?: number;
  message?: string;
}

export interface ExternalServicesHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    [key: string]: ComponentHealth;
  };
}

export interface LivenessStatus {
  status: 'alive' | 'dead';
  timestamp: string;
}

export interface ReadinessStatus {
  status: 'ready' | 'not_ready';
  timestamp: string;
  checks: {
    database: boolean;
    redis: boolean;
  };
}

/**
 * Check database connection health
 */
async function checkDatabase(): Promise<ComponentHealth> {
  const startTime = Date.now();
  
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - startTime;
    
    return {
      status: 'healthy',
      latency,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Database connection failed',
    };
  }
}

/**
 * Check Redis connection health
 */
async function checkRedis(): Promise<ComponentHealth> {
  const startTime = Date.now();
  
  try {
    const redis = getRedisClient();
    await redis.ping();
    const latency = Date.now() - startTime;
    
    return {
      status: 'healthy',
      latency,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Redis connection failed',
    };
  }
}

/**
 * Check external services health
 */
async function checkExternalServices(): Promise<ExternalServicesHealth> {
  const services: { [key: string]: ComponentHealth } = {};
  
  // Check OpenAI API (if configured)
  if (process.env.OPENAI_API_KEY) {
    try {
      const startTime = Date.now();
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        signal: AbortSignal.timeout(5000),
      });
      
      services.openai = {
        status: response.ok ? 'healthy' : 'unhealthy',
        latency: Date.now() - startTime,
        message: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (error) {
      services.openai = {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'OpenAI API check failed',
      };
    }
  }

  // Check Stripe API (if configured)
  if (process.env.STRIPE_SECRET_KEY) {
    try {
      const startTime = Date.now();
      const response = await fetch('https://api.stripe.com/v1/balance', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        },
        signal: AbortSignal.timeout(5000),
      });
      
      services.stripe = {
        status: response.ok ? 'healthy' : 'unhealthy',
        latency: Date.now() - startTime,
        message: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (error) {
      services.stripe = {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Stripe API check failed',
      };
    }
  }

  // Check S3 (if configured)
  if (process.env.AWS_S3_BUCKET) {
    try {
      const startTime = Date.now();
      // Simple HEAD request to check bucket accessibility
      const bucketUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'ap-northeast-1'}.amazonaws.com/`;
      const response = await fetch(bucketUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      });
      
      // 403 is expected if bucket exists but no public access
      services.s3 = {
        status: response.status === 403 || response.ok ? 'healthy' : 'unhealthy',
        latency: Date.now() - startTime,
      };
    } catch (error) {
      services.s3 = {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'S3 check failed',
      };
    }
  }

  // Determine overall status
  const serviceStatuses = Object.values(services);
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  
  if (serviceStatuses.some(s => s.status === 'unhealthy')) {
    overallStatus = serviceStatuses.every(s => s.status === 'unhealthy') ? 'unhealthy' : 'degraded';
  }

  return {
    status: overallStatus,
    services,
  };
}

/**
 * Get comprehensive health status
 */
export async function getHealthStatus(): Promise<HealthStatus> {
  const [database, redis, externalServices] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkExternalServices(),
  ]);

  // Determine overall status
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  
  if (database.status === 'unhealthy' || redis.status === 'unhealthy') {
    overallStatus = 'unhealthy';
  } else if (externalServices.status === 'degraded') {
    overallStatus = 'degraded';
  }

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.RELEASE_VERSION || 'unknown',
    uptime: process.uptime(),
    checks: {
      database,
      redis,
      externalServices,
    },
  };
}

/**
 * Get liveness status (is the process running?)
 */
export function getLivenessStatus(): LivenessStatus {
  return {
    status: 'alive',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get readiness status (is the service ready to accept traffic?)
 */
export async function getReadinessStatus(): Promise<ReadinessStatus> {
  const [database, redis] = await Promise.all([
    checkDatabase(),
    checkRedis(),
  ]);

  const isReady = database.status === 'healthy' && redis.status === 'healthy';

  return {
    status: isReady ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
    checks: {
      database: database.status === 'healthy',
      redis: redis.status === 'healthy',
    },
  };
}

/**
 * Cleanup resources
 */
export async function cleanup(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
  await prisma.$disconnect();
}

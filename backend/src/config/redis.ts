import Redis from 'ioredis';
import { config } from './index';

// Check if Redis is configured
const isRedisConfigured = config.redis.url && config.redis.url !== 'redis://localhost:6379';

// Create Redis client (or null if not configured)
let redis: Redis | null = null;
let redisAvailable = false;

if (isRedisConfigured) {
  try {
    redis = new Redis(config.redis.url, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      lazyConnect: true,
      retryStrategy: () => null, // Don't retry
    });

    // Event handlers
    redis.on('connect', () => {
      console.log('✅ Redis connected');
      redisAvailable = true;
    });

    redis.on('error', (error) => {
      console.error('❌ Redis connection error:', error.message);
      redisAvailable = false;
    });

    redis.on('close', () => {
      console.log('⚠️ Redis connection closed');
      redisAvailable = false;
    });

    // Try to connect
    redis.connect().catch(() => {
      console.log('⚠️ Redis not available, continuing without Redis');
      redisAvailable = false;
    });
  } catch (error) {
    console.log('⚠️ Redis initialization failed, continuing without Redis');
    redis = null;
    redisAvailable = false;
  }
} else {
  console.log('ℹ️ Redis not configured, running without Redis');
}

// Helper function to check if Redis is available
export const isRedisAvailable = () => redisAvailable && redis !== null;

// Session management utilities
export const sessionStore = {
  /**
   * Store session data
   */
  async set(sessionId: string, data: object, ttlSeconds: number = 86400): Promise<void> {
    if (!isRedisAvailable() || !redis) return;
    try {
      await redis.setex(`session:${sessionId}`, ttlSeconds, JSON.stringify(data));
    } catch (error) {
      console.warn('Redis sessionStore.set failed:', error);
    }
  },

  /**
   * Get session data
   */
  async get<T>(sessionId: string): Promise<T | null> {
    if (!isRedisAvailable() || !redis) return null;
    try {
      const data = await redis.get(`session:${sessionId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn('Redis sessionStore.get failed:', error);
      return null;
    }
  },

  /**
   * Delete session
   */
  async delete(sessionId: string): Promise<void> {
    if (!isRedisAvailable() || !redis) return;
    try {
      await redis.del(`session:${sessionId}`);
    } catch (error) {
      console.warn('Redis sessionStore.delete failed:', error);
    }
  },

  /**
   * Extend session TTL
   */
  async extend(sessionId: string, ttlSeconds: number = 86400): Promise<void> {
    if (!isRedisAvailable() || !redis) return;
    try {
      await redis.expire(`session:${sessionId}`, ttlSeconds);
    } catch (error) {
      console.warn('Redis sessionStore.extend failed:', error);
    }
  },
};

// Cache utilities
export const cache = {
  /**
   * Set cache with optional TTL
   */
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (!isRedisAvailable() || !redis) return;
    try {
      const cacheKey = `cache:${key}`;
      if (ttlSeconds) {
        await redis.setex(cacheKey, ttlSeconds, JSON.stringify(value));
      } else {
        await redis.set(cacheKey, JSON.stringify(value));
      }
    } catch (error) {
      console.warn('Redis cache.set failed:', error);
    }
  },

  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    if (!isRedisAvailable() || !redis) return null;
    try {
      const data = await redis.get(`cache:${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn('Redis cache.get failed:', error);
      return null;
    }
  },

  /**
   * Delete cached value
   */
  async delete(key: string): Promise<void> {
    if (!isRedisAvailable() || !redis) return;
    try {
      await redis.del(`cache:${key}`);
    } catch (error) {
      console.warn('Redis cache.delete failed:', error);
    }
  },

  /**
   * Delete all cached values matching pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    if (!isRedisAvailable() || !redis) return;
    try {
      const keys = await redis.keys(`cache:${pattern}`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.warn('Redis cache.deletePattern failed:', error);
    }
  },

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!isRedisAvailable() || !redis) return false;
    try {
      return (await redis.exists(`cache:${key}`)) === 1;
    } catch (error) {
      console.warn('Redis cache.exists failed:', error);
      return false;
    }
  },
};

// Rate limiting utilities
export const rateLimiter = {
  /**
   * Check and increment rate limit counter
   * Returns true if request is allowed, false if rate limited
   */
  async checkLimit(
    identifier: string,
    maxRequests: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    // If Redis is not available, allow all requests
    if (!isRedisAvailable() || !redis) {
      return {
        allowed: true,
        remaining: maxRequests,
        resetAt: Date.now() + windowSeconds * 1000,
      };
    }

    try {
      const key = `ratelimit:${identifier}`;
      const now = Date.now();
      const windowStart = now - windowSeconds * 1000;

      // Remove old entries
      await redis.zremrangebyscore(key, 0, windowStart);

      // Count current requests
      const currentCount = await redis.zcard(key);

      if (currentCount >= maxRequests) {
        const oldestEntry = await redis.zrange(key, 0, 0, 'WITHSCORES');
        const resetAt = oldestEntry.length > 1 ? parseInt(oldestEntry[1]) + windowSeconds * 1000 : now + windowSeconds * 1000;
        
        return {
          allowed: false,
          remaining: 0,
          resetAt,
        };
      }

      // Add new request
      await redis.zadd(key, now, `${now}-${Math.random()}`);
      await redis.expire(key, windowSeconds);

      return {
        allowed: true,
        remaining: maxRequests - currentCount - 1,
        resetAt: now + windowSeconds * 1000,
      };
    } catch (error) {
      console.warn('Redis rateLimiter.checkLimit failed:', error);
      // Allow request if Redis fails
      return {
        allowed: true,
        remaining: maxRequests,
        resetAt: Date.now() + windowSeconds * 1000,
      };
    }
  },
};

// Token blacklist for logout
export const tokenBlacklist = {
  /**
   * Add token to blacklist
   */
  async add(token: string, ttlSeconds: number): Promise<void> {
    if (!isRedisAvailable() || !redis) return;
    try {
      await redis.setex(`blacklist:${token}`, ttlSeconds, '1');
    } catch (error) {
      console.warn('Redis tokenBlacklist.add failed:', error);
    }
  },

  /**
   * Check if token is blacklisted
   */
  async isBlacklisted(token: string): Promise<boolean> {
    if (!isRedisAvailable() || !redis) return false;
    try {
      return (await redis.exists(`blacklist:${token}`)) === 1;
    } catch (error) {
      console.warn('Redis tokenBlacklist.isBlacklisted failed:', error);
      return false;
    }
  },
};

// Alias for compatibility
export const redisClient = redis;

export default redis;

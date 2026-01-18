import Redis from 'ioredis';
import { config } from './index';

// Create Redis client
export const redis = new Redis(config.redis.url, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
});

// Event handlers
redis.on('connect', () => {
  console.log('✅ Redis connected');
});

redis.on('error', (error) => {
  console.error('❌ Redis connection error:', error.message);
});

redis.on('close', () => {
  console.log('⚠️ Redis connection closed');
});

// Session management utilities
export const sessionStore = {
  /**
   * Store session data
   */
  async set(sessionId: string, data: object, ttlSeconds: number = 86400): Promise<void> {
    await redis.setex(`session:${sessionId}`, ttlSeconds, JSON.stringify(data));
  },

  /**
   * Get session data
   */
  async get<T>(sessionId: string): Promise<T | null> {
    const data = await redis.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  },

  /**
   * Delete session
   */
  async delete(sessionId: string): Promise<void> {
    await redis.del(`session:${sessionId}`);
  },

  /**
   * Extend session TTL
   */
  async extend(sessionId: string, ttlSeconds: number = 86400): Promise<void> {
    await redis.expire(`session:${sessionId}`, ttlSeconds);
  },
};

// Cache utilities
export const cache = {
  /**
   * Set cache with optional TTL
   */
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const cacheKey = `cache:${key}`;
    if (ttlSeconds) {
      await redis.setex(cacheKey, ttlSeconds, JSON.stringify(value));
    } else {
      await redis.set(cacheKey, JSON.stringify(value));
    }
  },

  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    const data = await redis.get(`cache:${key}`);
    return data ? JSON.parse(data) : null;
  },

  /**
   * Delete cached value
   */
  async delete(key: string): Promise<void> {
    await redis.del(`cache:${key}`);
  },

  /**
   * Delete all cached values matching pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    const keys = await redis.keys(`cache:${pattern}`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  },

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    return (await redis.exists(`cache:${key}`)) === 1;
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
  },
};

// Token blacklist for logout
export const tokenBlacklist = {
  /**
   * Add token to blacklist
   */
  async add(token: string, ttlSeconds: number): Promise<void> {
    await redis.setex(`blacklist:${token}`, ttlSeconds, '1');
  },

  /**
   * Check if token is blacklisted
   */
  async isBlacklisted(token: string): Promise<boolean> {
    return (await redis.exists(`blacklist:${token}`)) === 1;
  },
};

// Alias for compatibility
export const redisClient = redis;

export default redis;

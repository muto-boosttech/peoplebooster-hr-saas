import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3001'),
  API_VERSION: z.string().default('v1'),

  // Database
  DATABASE_URL: z.string(),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(Number).default('6379'),
  REDIS_PASSWORD: z.string().optional(),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32).optional(),
  JWT_ACCESS_EXPIRATION: z.string().default('15m'),
  JWT_REFRESH_EXPIRATION: z.string().default('7d'),
  JWT_ISSUER: z.string().default('peoplebooster'),
  JWT_AUDIENCE: z.string().default('peoplebooster-api'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),

  // Bcrypt
  BCRYPT_SALT_ROUNDS: z.string().transform(Number).default('12'),

  // SendGrid
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM_EMAIL: z.string().email().default('noreply@peoplebooster.com'),
  SENDGRID_FROM_NAME: z.string().default('PeopleBooster'),

  // AWS S3
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('ap-northeast-1'),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_S3_ENDPOINT: z.string().optional(),
  AWS_S3_PRESIGNED_URL_EXPIRATION: z.string().transform(Number).default('3600'),

  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // OpenAI
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4-turbo-preview'),
  OPENAI_MAX_TOKENS: z.string().transform(Number).default('4096'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('debug'),
  LOG_FORMAT: z.string().default('dev'),

  // Session
  SESSION_SECRET: z.string().optional(),
  SESSION_MAX_AGE: z.string().transform(Number).default('86400000'),
});

const envParsed = envSchema.safeParse(process.env);

if (!envParsed.success) {
  console.error('❌ Invalid environment variables:', envParsed.error.format());
  process.exit(1);
}

export const config = {
  env: envParsed.data.NODE_ENV,
  port: envParsed.data.PORT,
  apiVersion: envParsed.data.API_VERSION,
  isProduction: envParsed.data.NODE_ENV === 'production',
  isDevelopment: envParsed.data.NODE_ENV === 'development',
  isTest: envParsed.data.NODE_ENV === 'test',

  database: {
    url: envParsed.data.DATABASE_URL,
  },

  redis: {
    url: envParsed.data.REDIS_URL,
    host: envParsed.data.REDIS_HOST,
    port: envParsed.data.REDIS_PORT,
    password: envParsed.data.REDIS_PASSWORD,
  },

  jwt: {
    secret: envParsed.data.JWT_SECRET,
    refreshSecret: envParsed.data.JWT_REFRESH_SECRET || envParsed.data.JWT_SECRET,
    accessExpiration: envParsed.data.JWT_ACCESS_EXPIRATION,
    refreshExpiration: envParsed.data.JWT_REFRESH_EXPIRATION,
    issuer: envParsed.data.JWT_ISSUER,
    audience: envParsed.data.JWT_AUDIENCE,
  },

  cors: {
    origin: envParsed.data.CORS_ORIGIN,
  },

  rateLimit: {
    windowMs: envParsed.data.RATE_LIMIT_WINDOW_MS,
    maxRequests: envParsed.data.RATE_LIMIT_MAX_REQUESTS,
  },

  bcrypt: {
    saltRounds: envParsed.data.BCRYPT_SALT_ROUNDS,
  },

  sendgrid: {
    apiKey: envParsed.data.SENDGRID_API_KEY,
    fromEmail: envParsed.data.SENDGRID_FROM_EMAIL,
    fromName: envParsed.data.SENDGRID_FROM_NAME,
  },

  aws: {
    accessKeyId: envParsed.data.AWS_ACCESS_KEY_ID,
    secretAccessKey: envParsed.data.AWS_SECRET_ACCESS_KEY,
    region: envParsed.data.AWS_REGION,
    s3: {
      bucket: envParsed.data.AWS_S3_BUCKET,
      endpoint: envParsed.data.AWS_S3_ENDPOINT,
      presignedUrlExpiration: envParsed.data.AWS_S3_PRESIGNED_URL_EXPIRATION,
    },
  },

  stripe: {
    secretKey: envParsed.data.STRIPE_SECRET_KEY,
    webhookSecret: envParsed.data.STRIPE_WEBHOOK_SECRET,
  },

  openai: {
    apiKey: envParsed.data.OPENAI_API_KEY,
    model: envParsed.data.OPENAI_MODEL,
    maxTokens: envParsed.data.OPENAI_MAX_TOKENS,
  },

  logging: {
    level: envParsed.data.LOG_LEVEL,
    format: envParsed.data.LOG_FORMAT,
  },

  session: {
    secret: envParsed.data.SESSION_SECRET,
    maxAge: envParsed.data.SESSION_MAX_AGE,
  },
} as const;

export type Config = typeof config;

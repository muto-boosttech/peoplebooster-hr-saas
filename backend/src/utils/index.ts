import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { JwtPayload, ApiResponse, ApiError, PaginatedResponse } from '../types';

/**
 * Generate UUID v4
 */
export const generateUuid = (): string => uuidv4();

/**
 * Hash password using bcrypt
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, config.bcrypt.saltRounds);
};

/**
 * Compare password with hash
 */
export const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

/**
 * Generate JWT access token
 */
export const generateAccessToken = (payload: Omit<JwtPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.accessExpiration,
  });
};

/**
 * Generate JWT refresh token
 */
export const generateRefreshToken = (payload: Omit<JwtPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpiration,
  });
};

/**
 * Verify JWT token
 */
export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, config.jwt.secret) as JwtPayload;
};

/**
 * Create success API response
 */
export const successResponse = <T>(data: T, message?: string): ApiResponse<T> => ({
  success: true,
  data,
  message,
});

/**
 * Create error API response
 */
export const errorResponse = (
  message: string,
  errors?: ApiError[]
): ApiResponse => ({
  success: false,
  message,
  errors,
});

/**
 * Create paginated response
 */
export const paginatedResponse = <T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): PaginatedResponse<T> => ({
  data,
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  },
});

/**
 * Calculate deviation score (偏差値)
 * Mean = 50, Standard Deviation = 10
 */
export const calculateDeviationScore = (
  value: number,
  mean: number,
  standardDeviation: number
): number => {
  if (standardDeviation === 0) return 50;
  const deviationScore = ((value - mean) / standardDeviation) * 10 + 50;
  return Math.round(Math.max(0, Math.min(100, deviationScore)));
};

/**
 * Calculate similarity percentage between two users
 */
export const calculateSimilarity = (
  pattern1: Record<string, number>,
  pattern2: Record<string, number>
): number => {
  const keys = Object.keys(pattern1);
  if (keys.length === 0) return 0;

  let totalDiff = 0;
  for (const key of keys) {
    const diff = Math.abs((pattern1[key] || 0) - (pattern2[key] || 0));
    totalDiff += diff;
  }

  const maxDiff = keys.length * 100; // Assuming max value is 100
  const similarity = ((maxDiff - totalDiff) / maxDiff) * 100;
  return Math.round(similarity);
};

/**
 * Determine potential grade based on score
 */
export const getPotentialGrade = (score: number): 'A' | 'B' | 'C' | 'D' => {
  if (score >= 80) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  return 'D';
};

/**
 * Format date to ISO string
 */
export const formatDate = (date: Date): string => {
  return date.toISOString();
};

/**
 * Parse date string to Date object
 */
export const parseDate = (dateString: string): Date => {
  return new Date(dateString);
};

/**
 * Sleep utility for async operations
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Omit specified keys from object
 */
export const omit = <T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> => {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
};

/**
 * Pick specified keys from object
 */
export const pick = <T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> => {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
};

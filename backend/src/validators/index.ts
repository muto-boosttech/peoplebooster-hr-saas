import { z } from 'zod';
import { UserRole, SubUserPermission, CandidateStatus, MbtiType, AnimalType } from '../types';

// Common Validators
export const uuidSchema = z.string().uuid();
export const emailSchema = z.string().email();
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// Pagination Schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Auth Schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  nickname: z.string().min(1).max(100),
  fullName: z.string().min(1).max(100).optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const resetPasswordSchema = z.object({
  email: emailSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

// User Schemas
export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  nickname: z.string().min(1).max(100),
  fullName: z.string().min(1).max(100).optional(),
  role: z.nativeEnum(UserRole).default(UserRole.GENERAL_USER),
  companyId: uuidSchema.optional(),
  departmentId: uuidSchema.optional(),
  parentUserId: uuidSchema.optional(),
  subUserPermission: z.nativeEnum(SubUserPermission).optional(),
});

export const updateUserSchema = z.object({
  nickname: z.string().min(1).max(100).optional(),
  fullName: z.string().min(1).max(100).optional(),
  departmentId: uuidSchema.optional().nullable(),
  subUserPermission: z.nativeEnum(SubUserPermission).optional(),
});

// Company Schemas
export const createCompanySchema = z.object({
  name: z.string().min(1).max(255),
  logoUrl: z.string().url().optional(),
  planId: uuidSchema.optional(),
  contractStartDate: z.coerce.date(),
  contractEndDate: z.coerce.date().optional(),
});

export const updateCompanySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  logoUrl: z.string().url().optional().nullable(),
  planId: uuidSchema.optional(),
  contractEndDate: z.coerce.date().optional(),
  isActive: z.boolean().optional(),
});

// Department Schemas
export const createDepartmentSchema = z.object({
  name: z.string().min(1).max(255),
  companyId: uuidSchema,
  parentDepartmentId: uuidSchema.optional(),
});

export const updateDepartmentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  parentDepartmentId: uuidSchema.optional().nullable(),
});

// Survey Answer Schema
export const surveyAnswerSchema = z.object({
  questionId: uuidSchema,
  score: z.number().int().min(1).max(7),
});

export const submitSurveySchema = z.object({
  answers: z.array(surveyAnswerSchema).min(1),
  page: z.number().int().min(1).max(3),
});

// External Diagnosis Schemas
export const externalDiagnosisSchema = z.object({
  mbtiType: z.enum([
    'INTJ', 'INTP', 'ENTJ', 'ENTP',
    'INFJ', 'INFP', 'ENFJ', 'ENFP',
    'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
    'ISTP', 'ISFP', 'ESTP', 'ESFP',
  ] as const).optional(),
  animalType: z.enum([
    'lion', 'cheetah', 'pegasus', 'elephant',
    'monkey', 'wolf', 'koala', 'tiger',
    'raccoon', 'sheep', 'fawn', 'earth',
  ] as const).optional(),
});

// Interview Comment Schema
export const createInterviewCommentSchema = z.object({
  candidateId: uuidSchema,
  comment: z.string().min(1).max(5000),
  rating: z.number().int().min(1).max(5),
  interviewDate: z.coerce.date(),
  structuredEvaluation: z.object({
    starFulfillment: z.number().min(0).max(100).optional(),
    riskIndicators: z.array(z.string()).optional(),
    communicationStructure: z.number().min(0).max(100).optional(),
    valueAlignment: z.number().min(0).max(100).optional(),
  }).optional(),
});

// Candidate Schemas
export const createCandidateSchema = z.object({
  userId: uuidSchema.optional(),
  email: emailSchema,
  fullName: z.string().min(1).max(100),
  currentJobTitle: z.string().max(255).optional(),
  status: z.nativeEnum(CandidateStatus).default(CandidateStatus.NOT_STARTED),
  tags: z.array(z.string()).optional(),
});

export const updateCandidateStatusSchema = z.object({
  status: z.nativeEnum(CandidateStatus),
});

// Interview Schedule Schema
export const createInterviewSchema = z.object({
  candidateId: uuidSchema,
  interviewerId: uuidSchema,
  scheduledAt: z.coerce.date(),
  duration: z.number().int().min(15).max(480).default(60),
  location: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
});

export const updateInterviewSchema = z.object({
  scheduledAt: z.coerce.date().optional(),
  duration: z.number().int().min(15).max(480).optional(),
  location: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
  interviewerId: uuidSchema.optional(),
});

// Type exports
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
export type SubmitSurveyInput = z.infer<typeof submitSurveySchema>;
export type ExternalDiagnosisInput = z.infer<typeof externalDiagnosisSchema>;
export type CreateInterviewCommentInput = z.infer<typeof createInterviewCommentSchema>;
export type CreateCandidateInput = z.infer<typeof createCandidateSchema>;
export type UpdateCandidateStatusInput = z.infer<typeof updateCandidateStatusSchema>;
export type CreateInterviewInput = z.infer<typeof createInterviewSchema>;
export type UpdateInterviewInput = z.infer<typeof updateInterviewSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;

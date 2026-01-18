import { Request } from 'express';

// 認可関連の型定義をエクスポート
export * from './auth.types';

// User Roles (legacy - use UserRole from @prisma/client or auth.types instead)
export enum UserRole {
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
  COMPANY_ADMIN = 'COMPANY_ADMIN',
  COMPANY_USER = 'COMPANY_USER',
  GENERAL_USER = 'GENERAL_USER',
}

// Sub User Permission (legacy - use SubUserPermission from @prisma/client or auth.types instead)
export enum SubUserPermission {
  VIEW_ONLY = 'VIEW_ONLY',
  EDIT = 'EDIT',
  FULL = 'FULL',
}

// Candidate Status
export enum CandidateStatus {
  UNTOUCHED = 'UNTOUCHED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  DOCUMENT_SCREENING = 'DOCUMENT_SCREENING',
  FIRST_INTERVIEW = 'FIRST_INTERVIEW',
  SECOND_INTERVIEW = 'SECOND_INTERVIEW',
  FINAL_INTERVIEW = 'FINAL_INTERVIEW',
  OFFER = 'OFFER',
  HIRED = 'HIRED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
  ON_HOLD = 'ON_HOLD',
}

// Stress Tolerance Level
export enum StressToleranceLevel {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

// Potential Score Grade
export enum PotentialGrade {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
}

// JWT Payload
export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  companyId?: string;
  departmentId?: string;
  parentUserId?: string;
  subUserPermission?: SubUserPermission;
  iat?: number;
  exp?: number;
}

// Extended Request with User
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: ApiError[];
}

export interface ApiError {
  field?: string;
  message: string;
  code?: string;
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Thinking Pattern (RASE)
export interface ThinkingPattern {
  leader: number; // R - リーダー適性
  analyst: number; // A - アナリスト適性
  supporter: number; // S - サポーター適性
  energetic: number; // E - エネルギッシュ適性
}

// Behavior Pattern
export interface BehaviorPattern {
  efficiency: number; // 効率重視
  friendliness: number; // 友好重視
  knowledge: number; // 知識重視
  appearance: number; // 体裁重視
  challenge: number; // 挑戦重視
}

// Big Five Personality Traits
export interface BigFive {
  extraversion: number; // 外向性
  neuroticism: number; // 神経症傾向
  openness: number; // 開放性
  agreeableness: number; // 協調性
  conscientiousness: number; // 誠実性
}

// MBTI Types
export type MbtiType =
  | 'INTJ' | 'INTP' | 'ENTJ' | 'ENTP'
  | 'INFJ' | 'INFP' | 'ENFJ' | 'ENFP'
  | 'ISTJ' | 'ISFJ' | 'ESTJ' | 'ESFJ'
  | 'ISTP' | 'ISFP' | 'ESTP' | 'ESFP';

// Animal Fortune Types (動物占い)
export type AnimalType =
  | 'lion' | 'cheetah' | 'pegasus' | 'elephant'
  | 'monkey' | 'wolf' | 'koala' | 'tiger'
  | 'raccoon' | 'sheep' | 'fawn' | 'earth';

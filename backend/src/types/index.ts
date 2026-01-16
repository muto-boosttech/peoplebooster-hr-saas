import { Request } from 'express';

// User Roles
export enum UserRole {
  SYSTEM_ADMIN = 'system_admin',
  COMPANY_ADMIN = 'company_admin',
  COMPANY_USER = 'company_user',
  GENERAL_USER = 'general_user',
}

// Sub User Permission
export enum SubUserPermission {
  VIEW_ONLY = 'view_only',
  EDIT = 'edit',
  FULL = 'full',
}

// Candidate Status
export enum CandidateStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  DOCUMENT_REVIEW = 'document_review',
  FIRST_INTERVIEW = 'first_interview',
  SECOND_INTERVIEW = 'second_interview',
  FINAL_INTERVIEW = 'final_interview',
  OFFER = 'offer',
  HIRED = 'hired',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
  ON_HOLD = 'on_hold',
}

// Stress Tolerance Level
export enum StressToleranceLevel {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
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

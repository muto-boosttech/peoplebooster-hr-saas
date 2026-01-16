// User Roles
export enum UserRole {
  SYSTEM_ADMIN = 'system_admin',
  COMPANY_ADMIN = 'company_admin',
  COMPANY_USER = 'company_user',
  GENERAL_USER = 'general_user',
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

// User
export interface User {
  id: string;
  email: string;
  nickname: string;
  fullName?: string;
  role: UserRole;
  companyId?: string;
  companyName?: string;
  departmentId?: string;
  departmentName?: string;
  createdAt: string;
  updatedAt: string;
}

// Auth
export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  nickname: string;
  fullName?: string;
}

// Company
export interface Company {
  id: string;
  name: string;
  logoUrl?: string;
  planId?: string;
  diagnosisUrl?: string;
  contractStartDate: string;
  contractEndDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Department
export interface Department {
  id: string;
  name: string;
  companyId: string;
  parentDepartmentId?: string;
  createdAt: string;
  updatedAt: string;
}

// Diagnosis Result
export interface DiagnosisResult {
  id: string;
  userId: string;
  typeName: string;
  featureLabels: string[];
  thinkingPattern: ThinkingPattern;
  behaviorPattern: BehaviorPattern;
  bigFive: BigFive;
  stressTolerance: 'high' | 'medium' | 'low';
  version: string;
  completedAt: string;
}

export interface ThinkingPattern {
  leader: number;
  analyst: number;
  supporter: number;
  energetic: number;
}

export interface BehaviorPattern {
  efficiency: number;
  friendliness: number;
  knowledge: number;
  appearance: number;
  challenge: number;
}

export interface BigFive {
  extraversion: number;
  neuroticism: number;
  openness: number;
  agreeableness: number;
  conscientiousness: number;
}

// Survey
export interface SurveyQuestion {
  id: string;
  questionNumber: number;
  text: string;
  page: number;
}

export interface SurveyAnswer {
  questionId: string;
  score: number;
}

// Candidate
export interface Candidate {
  id: string;
  userId?: string;
  email: string;
  fullName: string;
  currentJobTitle?: string;
  status: CandidateStatus;
  tags: string[];
  diagnosisResult?: DiagnosisResult;
  createdAt: string;
  updatedAt: string;
}

// Interview
export interface Interview {
  id: string;
  candidateId: string;
  interviewerId: string;
  scheduledAt: string;
  duration: number;
  location?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Interview Comment
export interface InterviewComment {
  id: string;
  candidateId: string;
  interviewerId: string;
  interviewerName: string;
  comment: string;
  rating: number;
  interviewDate: string;
  createdAt: string;
}

// Potential Score
export interface PotentialScore {
  id: string;
  userId: string;
  jobType: string;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D';
}

// Similarity Score
export interface SimilarityScore {
  userId: string;
  userName: string;
  similarity: number;
  departmentName?: string;
}

// API Response
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
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// MBTI Types
export type MbtiType =
  | 'INTJ' | 'INTP' | 'ENTJ' | 'ENTP'
  | 'INFJ' | 'INFP' | 'ENFJ' | 'ENFP'
  | 'ISTJ' | 'ISFJ' | 'ESTJ' | 'ESFJ'
  | 'ISTP' | 'ISFP' | 'ESTP' | 'ESFP';

// Animal Fortune Types
export type AnimalType =
  | 'lion' | 'cheetah' | 'pegasus' | 'elephant'
  | 'monkey' | 'wolf' | 'koala' | 'tiger'
  | 'raccoon' | 'sheep' | 'fawn' | 'earth';

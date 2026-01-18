// User Roles
export type UserRole = 'SYSTEM_ADMIN' | 'COMPANY_ADMIN' | 'COMPANY_USER' | 'GENERAL_USER';

// Legacy enum for backward compatibility
export enum UserRoleEnum {
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
  COMPANY_ADMIN = 'COMPANY_ADMIN',
  COMPANY_USER = 'COMPANY_USER',
  GENERAL_USER = 'GENERAL_USER',
}

// Candidate Status
export type CandidateStatus =
  | 'UNTOUCHED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'DOCUMENT_SCREENING'
  | 'FIRST_INTERVIEW'
  | 'SECOND_INTERVIEW'
  | 'FINAL_INTERVIEW'
  | 'OFFER'
  | 'HIRED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'ON_HOLD';

// Legacy enum for backward compatibility
export enum CandidateStatusEnum {
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

// Sub User Permission
export type SubUserPermission = 'VIEW_ONLY' | 'EDIT' | 'FULL';

// User
export interface User {
  id: string;
  email: string;
  fullName: string;
  nickname?: string;
  role: UserRole;
  companyId?: string | null;
  companyName?: string;
  departmentId?: string | null;
  departmentName?: string;
  parentUserId?: string | null;
  subUserPermission?: SubUserPermission | null;
  avatarUrl?: string | null;
  isActive: boolean;
  emailVerified: boolean;
  mfaEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  company?: Company | null;
  department?: Department | null;
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
  fullName: string;
  nickname?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponse {
  success: boolean;
  data?: {
    user: User;
    tokens: AuthTokens;
    requiresMfa?: boolean;
    mfaToken?: string;
  };
  error?: ApiError;
}

// Company
export interface Company {
  id: string;
  name: string;
  logoUrl?: string | null;
  planId?: string | null;
  diagnosisUrl?: string;
  stripeCustomerId?: string | null;
  contractStartDate?: string;
  contractEndDate?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Department
export interface Department {
  id: string;
  name: string;
  companyId: string;
  parentDepartmentId?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Diagnosis Result
export interface DiagnosisResult {
  id: string;
  userId: string;
  sessionId: string;
  typeName: string;
  featureLabels: string[];
  thinkingPattern: ThinkingPattern;
  behaviorPattern: BehaviorPattern;
  bigFive: BigFive;
  stressTolerance: 'high' | 'medium' | 'low';
  scores?: Record<string, number>;
  analysis?: Record<string, unknown> | null;
  version: string;
  completedAt: string;
  createdAt: string;
  updatedAt: string;
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
  userId?: string | null;
  companyId: string;
  email?: string;
  fullName?: string;
  currentJobTitle?: string;
  appliedPosition?: string | null;
  source?: string | null;
  status: CandidateStatus;
  tags: string[];
  assignedUserId?: string | null;
  previousStatus?: CandidateStatus | null;
  diagnosisResult?: DiagnosisResult | null;
  user?: User | null;
  assignedUser?: User | null;
  createdAt: string;
  updatedAt: string;
}

// Interview Type
export type InterviewType = 'IN_PERSON' | 'VIDEO' | 'PHONE';

// Interview Status
export type InterviewStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

// Interview
export interface Interview {
  id: string;
  candidateId: string;
  interviewerId: string;
  scheduledAt: string;
  duration: number;
  type: InterviewType;
  status: InterviewStatus;
  location?: string | null;
  meetingUrl?: string | null;
  notes?: string | null;
  candidate?: Candidate;
  interviewer?: User;
  createdAt: string;
  updatedAt: string;
}

// Interview Comment
export interface InterviewComment {
  id: string;
  candidateId: string;
  authorId: string;
  interviewerId?: string;
  interviewerName?: string;
  interviewDate: string;
  comment: string;
  rating: number;
  tags: string[];
  author?: User;
  createdAt: string;
  updatedAt: string;
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

// Invoice Status
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';

// Invoice
export interface Invoice {
  id: string;
  companyId: string;
  invoiceNumber: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  dueDate: string;
  subtotal: number;
  tax: number;
  total: number;
  status: InvoiceStatus;
  paidAt?: string | null;
  pdfUrl?: string | null;
  stripeInvoiceId?: string | null;
  company?: Company;
  createdAt: string;
  updatedAt: string;
}

// Invoice Line Item
export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

// Notification Type
export type NotificationType = 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR';

// Notification
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  actionUrl?: string | null;
  createdAt: string;
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
  details?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiError;
}

// Pagination
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  success?: boolean;
  data: T[];
  pagination: Pagination;
}

// Menu Item
export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  roles?: UserRole[];
  children?: MenuItem[];
}

// Breadcrumb Item
export interface BreadcrumbItem {
  label: string;
  href?: string;
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

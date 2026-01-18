import { api, setTokens, clearTokens, getAccessToken } from './api-client';
import { User, LoginCredentials, AuthTokens, UserRole } from '@/types';

/**
 * ログイン
 */
export async function login(credentials: LoginCredentials): Promise<{
  user: User;
  tokens: AuthTokens;
  requiresMfa?: boolean;
  mfaToken?: string;
}> {
  const response = await api.post<{
    user: User;
    tokens: AuthTokens;
    requiresMfa?: boolean;
    mfaToken?: string;
  }>('/auth/login', credentials);

  if (response.success && response.data) {
    if (!response.data.requiresMfa) {
      setTokens(response.data.tokens);
    }
    return response.data;
  }

  throw new Error('Login failed');
}

/**
 * MFA認証
 */
export async function verifyMfa(mfaToken: string, code: string): Promise<{
  user: User;
  tokens: AuthTokens;
}> {
  const response = await api.post<{
    user: User;
    tokens: AuthTokens;
  }>('/auth/mfa/verify', { mfaToken, code });

  if (response.success && response.data) {
    setTokens(response.data.tokens);
    return response.data;
  }

  throw new Error('MFA verification failed');
}

/**
 * ログアウト
 */
export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } finally {
    clearTokens();
  }
}

/**
 * 現在のユーザー情報を取得
 */
export async function getCurrentUser(): Promise<User | null> {
  const token = getAccessToken();
  if (!token) return null;

  try {
    const response = await api.get<User>('/auth/me');
    if (response.success && response.data) {
      return response.data;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * パスワードリセットリクエスト
 */
export async function requestPasswordReset(email: string): Promise<void> {
  await api.post('/auth/password-reset/request', { email });
}

/**
 * パスワードリセット
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await api.post('/auth/password-reset/reset', { token, newPassword });
}

/**
 * パスワード変更
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.post('/auth/password/change', { currentPassword, newPassword });
}

/**
 * MFA設定を有効化
 */
export async function enableMfa(): Promise<{ secret: string; qrCode: string }> {
  const response = await api.post<{ secret: string; qrCode: string }>('/auth/mfa/enable');
  if (response.success && response.data) {
    return response.data;
  }
  throw new Error('Failed to enable MFA');
}

/**
 * MFA設定を確認
 */
export async function confirmMfa(code: string): Promise<{ backupCodes: string[] }> {
  const response = await api.post<{ backupCodes: string[] }>('/auth/mfa/confirm', { code });
  if (response.success && response.data) {
    return response.data;
  }
  throw new Error('Failed to confirm MFA');
}

/**
 * MFA設定を無効化
 */
export async function disableMfa(code: string): Promise<void> {
  await api.post('/auth/mfa/disable', { code });
}

/**
 * ロールの表示名を取得
 */
export function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    SYSTEM_ADMIN: 'システム管理者',
    COMPANY_ADMIN: '企業管理者',
    COMPANY_USER: '企業ユーザー',
    GENERAL_USER: '一般ユーザー',
  };
  return roleNames[role] || role;
}

/**
 * ロールの権限レベルを取得
 */
export function getRoleLevel(role: UserRole): number {
  const roleLevels: Record<UserRole, number> = {
    SYSTEM_ADMIN: 100,
    COMPANY_ADMIN: 80,
    COMPANY_USER: 60,
    GENERAL_USER: 40,
  };
  return roleLevels[role] || 0;
}

/**
 * 指定されたロール以上の権限を持っているか確認
 */
export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return getRoleLevel(userRole) >= getRoleLevel(requiredRole);
}

/**
 * 指定されたロールのいずれかを持っているか確認
 */
export function hasAnyRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole);
}

/**
 * 認証済みかどうか確認
 */
export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { LoginCredentials, UserRole } from '@/types';
import * as authLib from '@/lib/auth';

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    user,
    isAuthenticated,
    isLoading,
    isInitialized,
    setUser,
    setTokens,
    setLoading,
    logout: storeLogout,
    initialize,
    hasRole,
    hasMinRole,
    hasAnyRoles,
    isSystemAdmin,
    isCompanyAdmin,
    isCompanyUser,
    canAccessCompanyData,
  } = useAuthStore();

  // Initialize auth state on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => authLib.login(credentials),
    onSuccess: (data) => {
      if (!data.requiresMfa) {
        setUser(data.user);
        setTokens(data.tokens);
        queryClient.invalidateQueries();
      }
    },
  });

  // MFA verification mutation
  const mfaMutation = useMutation({
    mutationFn: ({ mfaToken, code }: { mfaToken: string; code: string }) =>
      authLib.verifyMfa(mfaToken, code),
    onSuccess: (data) => {
      setUser(data.user);
      setTokens(data.tokens);
      queryClient.invalidateQueries();
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => authLib.logout(),
    onSuccess: () => {
      storeLogout();
      queryClient.clear();
      router.push('/login');
    },
    onError: () => {
      // Even on error, clear local state
      storeLogout();
      queryClient.clear();
      router.push('/login');
    },
  });

  // Login handler
  const login = useCallback(
    async (credentials: LoginCredentials) => {
      return loginMutation.mutateAsync(credentials);
    },
    [loginMutation]
  );

  // MFA verification handler
  const verifyMfa = useCallback(
    async (mfaToken: string, code: string) => {
      return mfaMutation.mutateAsync({ mfaToken, code });
    },
    [mfaMutation]
  );

  // Logout handler
  const logout = useCallback(async () => {
    return logoutMutation.mutateAsync();
  }, [logoutMutation]);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    setLoading(true);
    try {
      const userData = await authLib.getCurrentUser();
      setUser(userData);
    } finally {
      setLoading(false);
    }
  }, [setUser, setLoading]);

  // Check if user has required role for a route
  const checkAccess = useCallback(
    (requiredRoles?: UserRole[]) => {
      if (!isAuthenticated || !user) return false;
      if (!requiredRoles || requiredRoles.length === 0) return true;
      return hasAnyRoles(requiredRoles);
    },
    [isAuthenticated, user, hasAnyRoles]
  );

  // Redirect if not authenticated
  const requireAuth = useCallback(
    (redirectTo: string = '/login') => {
      if (isInitialized && !isAuthenticated) {
        router.push(redirectTo);
        return false;
      }
      return true;
    },
    [isInitialized, isAuthenticated, router]
  );

  // Redirect if not authorized
  const requireRole = useCallback(
    (requiredRoles: UserRole[], redirectTo: string = '/unauthorized') => {
      if (isInitialized && isAuthenticated && !checkAccess(requiredRoles)) {
        router.push(redirectTo);
        return false;
      }
      return true;
    },
    [isInitialized, isAuthenticated, checkAccess, router]
  );

  return {
    // State
    user,
    isAuthenticated,
    isLoading: isLoading || loginMutation.isPending || logoutMutation.isPending,
    isInitialized,

    // Auth actions
    login,
    verifyMfa,
    logout,
    refreshUser,

    // Mutation states
    loginError: loginMutation.error,
    mfaError: mfaMutation.error,
    isLoginPending: loginMutation.isPending,
    isMfaPending: mfaMutation.isPending,
    isLogoutPending: logoutMutation.isPending,

    // Authorization helpers
    hasRole,
    hasMinRole,
    hasAnyRoles,
    isSystemAdmin,
    isCompanyAdmin,
    isCompanyUser,
    canAccessCompanyData,
    checkAccess,
    requireAuth,
    requireRole,
  };
}

/**
 * Hook to require authentication for a page
 */
export function useRequireAuth(allowedRoles?: UserRole[]) {
  const { user, isAuthenticated, isLoading, isInitialized, hasAnyRoles } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isInitialized) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (allowedRoles && allowedRoles.length > 0 && user) {
      if (!hasAnyRoles(allowedRoles)) {
        router.push('/dashboard');
      }
    }
  }, [isInitialized, isAuthenticated, user, allowedRoles, hasAnyRoles, router]);

  return { user, isLoading, isAuthenticated };
}

/**
 * Hook to redirect if already authenticated
 */
export function useRedirectIfAuthenticated(redirectTo: string = '/dashboard') {
  const { isAuthenticated, isLoading, isInitialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isInitialized, isAuthenticated, redirectTo, router]);

  return { isLoading };
}

export default useAuth;

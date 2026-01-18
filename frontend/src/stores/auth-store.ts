import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, AuthTokens, UserRole } from '@/types';
import { setTokens, clearTokens } from '@/lib/api-client';
import { getCurrentUser, hasMinimumRole, hasAnyRole } from '@/lib/auth';

interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setTokens: (tokens: AuthTokens) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  initialize: () => Promise<void>;

  // Computed helpers
  hasRole: (role: UserRole) => boolean;
  hasMinRole: (role: UserRole) => boolean;
  hasAnyRoles: (roles: UserRole[]) => boolean;
  isSystemAdmin: () => boolean;
  isCompanyAdmin: () => boolean;
  isCompanyUser: () => boolean;
  canAccessCompanyData: (companyId: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: true,
      isInitialized: false,

      // Actions
      setUser: (user) => {
        set({
          user,
          isAuthenticated: !!user,
        });
      },

      setTokens: (tokens) => {
        setTokens(tokens);
        set({ isAuthenticated: true });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      logout: () => {
        clearTokens();
        set({
          user: null,
          isAuthenticated: false,
        });
      },

      initialize: async () => {
        const state = get();
        if (state.isInitialized) return;

        set({ isLoading: true });

        try {
          const user = await getCurrentUser();
          set({
            user,
            isAuthenticated: !!user,
            isInitialized: true,
          });
        } catch {
          set({
            user: null,
            isAuthenticated: false,
            isInitialized: true,
          });
        } finally {
          set({ isLoading: false });
        }
      },

      // Computed helpers
      hasRole: (role) => {
        const { user } = get();
        return user?.role === role;
      },

      hasMinRole: (role) => {
        const { user } = get();
        if (!user) return false;
        return hasMinimumRole(user.role, role);
      },

      hasAnyRoles: (roles) => {
        const { user } = get();
        if (!user) return false;
        return hasAnyRole(user.role, roles);
      },

      isSystemAdmin: () => {
        const { user } = get();
        return user?.role === 'SYSTEM_ADMIN';
      },

      isCompanyAdmin: () => {
        const { user } = get();
        return user?.role === 'COMPANY_ADMIN' || user?.role === 'SYSTEM_ADMIN';
      },

      isCompanyUser: () => {
        const { user } = get();
        return ['SYSTEM_ADMIN', 'COMPANY_ADMIN', 'COMPANY_USER'].includes(user?.role || '');
      },

      canAccessCompanyData: (companyId) => {
        const { user } = get();
        if (!user) return false;
        if (user.role === 'SYSTEM_ADMIN') return true;
        return user.companyId === companyId;
      },
    }),
    {
      name: 'peoplebooster-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Selector hooks for better performance
export const useUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useIsLoading = () => useAuthStore((state) => state.isLoading);
export const useIsInitialized = () => useAuthStore((state) => state.isInitialized);

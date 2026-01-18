'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { User, PaginatedResponse } from '@/types';

interface UseUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  companyId?: string;
  isActive?: boolean;
}

/**
 * ユーザー一覧を取得するフック
 */
export function useUsers(params: UseUsersParams = {}) {
  const { page = 1, limit = 10, search, role, companyId, isActive } = params;

  return useQuery({
    queryKey: ['users', { page, limit, search, role, companyId, isActive }],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      queryParams.set('page', String(page));
      queryParams.set('limit', String(limit));
      if (search) queryParams.set('search', search);
      if (role) queryParams.set('role', role);
      if (companyId) queryParams.set('companyId', companyId);
      if (isActive !== undefined) queryParams.set('isActive', String(isActive));

      const response = await api.get<PaginatedResponse<User>>(`/users?${queryParams.toString()}`);
      return response.data;
    },
  });
}

/**
 * 単一ユーザーを取得するフック
 */
export function useUser(userId: string | undefined) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await api.get<User>(`/users/${userId}`);
      return response.data;
    },
    enabled: !!userId,
  });
}

/**
 * ユーザー作成ミューテーション
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<User> & { password?: string }) => {
      const response = await api.post<User>('/users', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

/**
 * ユーザー更新ミューテーション
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<User> }) => {
      const response = await api.put<User>(`/users/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', variables.id] });
    },
  });
}

/**
 * ユーザー削除ミューテーション
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

/**
 * ユーザー有効化/無効化ミューテーション
 */
export function useToggleUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await api.put<User>(`/users/${id}/status`, { isActive });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', variables.id] });
    },
  });
}

/**
 * パスワードリセットミューテーション
 */
export function useResetUserPassword() {
  return useMutation({
    mutationFn: async (userId: string) => {
      await api.post(`/users/${userId}/reset-password`);
    },
  });
}

export default useUser;

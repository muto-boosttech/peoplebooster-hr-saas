'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Candidate, CandidateStatus, PaginatedResponse } from '@/types';

interface UseCandidatesParams {
  page?: number;
  limit?: number;
  status?: CandidateStatus[];
  appliedPosition?: string;
  search?: string;
  assignedTo?: string;
  tags?: string[];
  sortBy?: 'createdAt' | 'status' | 'appliedPosition';
  sortOrder?: 'asc' | 'desc';
}

/**
 * 候補者一覧を取得するフック
 */
export function useCandidates(params: UseCandidatesParams = {}) {
  const {
    page = 1,
    limit = 10,
    status,
    appliedPosition,
    search,
    assignedTo,
    tags,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = params;

  return useQuery({
    queryKey: ['candidates', params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      queryParams.set('page', String(page));
      queryParams.set('limit', String(limit));
      queryParams.set('sortBy', sortBy);
      queryParams.set('sortOrder', sortOrder);

      if (status && status.length > 0) {
        status.forEach((s) => queryParams.append('status', s));
      }
      if (appliedPosition) queryParams.set('appliedPosition', appliedPosition);
      if (search) queryParams.set('search', search);
      if (assignedTo) queryParams.set('assignedTo', assignedTo);
      if (tags && tags.length > 0) {
        tags.forEach((t) => queryParams.append('tags', t));
      }

      const response = await api.get<PaginatedResponse<Candidate>>(`/candidates?${queryParams.toString()}`);
      return response.data;
    },
  });
}

/**
 * 単一候補者を取得するフック
 */
export function useCandidate(candidateId: string | undefined) {
  return useQuery({
    queryKey: ['candidate', candidateId],
    queryFn: async () => {
      if (!candidateId) return null;
      const response = await api.get<Candidate>(`/candidates/${candidateId}`);
      return response.data;
    },
    enabled: !!candidateId,
  });
}

/**
 * 候補者作成ミューテーション
 */
export function useCreateCandidate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      userId?: string;
      email?: string;
      fullName?: string;
      appliedPosition?: string;
      source?: string;
    }) => {
      const response = await api.post<Candidate>('/candidates', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
  });
}

/**
 * 候補者更新ミューテーション
 */
export function useUpdateCandidate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Candidate> }) => {
      const response = await api.put<Candidate>(`/candidates/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['candidate', variables.id] });
    },
  });
}

/**
 * 候補者ステータス更新ミューテーション
 */
export function useUpdateCandidateStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CandidateStatus }) => {
      const response = await api.put<Candidate>(`/candidates/${id}/status`, { status });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['candidate', variables.id] });
    },
  });
}

/**
 * 候補者担当者割り当てミューテーション
 */
export function useAssignCandidate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, assignedTo }: { id: string; assignedTo: string }) => {
      const response = await api.put<Candidate>(`/candidates/${id}/assign`, { assignedTo });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['candidate', variables.id] });
    },
  });
}

/**
 * 候補者タグ追加ミューテーション
 */
export function useAddCandidateTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, tags }: { id: string; tags: string[] }) => {
      const response = await api.post<Candidate>(`/candidates/${id}/tags`, { tags });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['candidate', variables.id] });
    },
  });
}

/**
 * 候補者タグ削除ミューテーション
 */
export function useRemoveCandidateTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, tags }: { id: string; tags: string[] }) => {
      const response = await api.delete<Candidate>(`/candidates/${id}/tags`, {
        data: { tags },
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['candidate', variables.id] });
    },
  });
}

/**
 * 候補者削除ミューテーション
 */
export function useDeleteCandidate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (candidateId: string) => {
      await api.delete(`/candidates/${candidateId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
  });
}

/**
 * 候補者統計を取得するフック
 */
export function useCandidateStatistics() {
  return useQuery({
    queryKey: ['candidate-statistics'],
    queryFn: async () => {
      const response = await api.get<{
        total: number;
        byStatus: Record<CandidateStatus, number>;
        byPosition: Record<string, number>;
        recentActivity: { date: string; count: number }[];
      }>('/candidates/statistics');
      return response.data;
    },
  });
}

export default useCandidates;

'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { Mechanic, MechanicPayload, MechanicWorkload, Paginated } from '@/lib/types';

const MECHANICS_QUERY_KEY = 'mechanics';

async function fetchMechanicOptions() {
  const response = await apiClient.get<Paginated<Mechanic>>('/mechanics/', {
    params: { is_active: true, page_size: 100 },
  });
  return response.data.results;
}

async function fetchMechanicWorkload(page: number, pageSize: number) {
  const response = await apiClient.get<Paginated<MechanicWorkload>>('/mechanics/workload/', {
    params: { page, page_size: pageSize },
  });
  return response.data;
}

async function saveMechanic({ id, ...payload }: MechanicPayload & { id?: number }) {
  const response = id
    ? await apiClient.put<Mechanic>(`/mechanics/${id}/`, payload)
    : await apiClient.post<Mechanic>('/mechanics/', payload);
  return response.data;
}

async function fetchActiveMechanicCount() {
  // Only the total is needed, so ask for the smallest page.
  const response = await apiClient.get<Paginated<Mechanic>>('/mechanics/', {
    params: { is_active: true, page_size: 1 },
  });
  return response.data.count;
}

export function useActiveMechanicCount() {
  return useQuery({
    queryKey: [MECHANICS_QUERY_KEY, 'active-count'],
    queryFn: fetchActiveMechanicCount,
  });
}

/** Active mechanics, for the dropdown of the maintenance form. */
export function useMechanicOptions() {
  return useQuery({
    queryKey: [MECHANICS_QUERY_KEY, 'options'],
    queryFn: fetchMechanicOptions,
    staleTime: 60_000,
  });
}

export function useMechanicWorkload(page: number, pageSize: number) {
  return useQuery({
    queryKey: [MECHANICS_QUERY_KEY, 'workload', page, pageSize],
    queryFn: () => fetchMechanicWorkload(page, pageSize),
    placeholderData: keepPreviousData,
  });
}

export function useSaveMechanic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveMechanic,
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function useDeleteMechanic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/mechanics/${id}/`),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

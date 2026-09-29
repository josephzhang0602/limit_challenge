'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { Office, OfficePayload, OfficeSummary, Paginated } from '@/lib/types';

const OFFICES_QUERY_KEY = 'offices';

async function fetchOfficeOptions() {
  // The largest page the API allows. Enough for a dropdown in this challenge.
  const response = await apiClient.get<Paginated<Office>>('/offices/', {
    params: { page_size: 100 },
  });
  return response.data.results;
}

async function fetchOfficeSummary() {
  const response = await apiClient.get<OfficeSummary[]>('/offices/summary/');
  return response.data;
}

async function saveOffice({ id, ...payload }: OfficePayload & { id?: number }) {
  const response = id
    ? await apiClient.put<Office>(`/offices/${id}/`, payload)
    : await apiClient.post<Office>('/offices/', payload);
  return response.data;
}

export function useOfficeOptions() {
  return useQuery({
    queryKey: [OFFICES_QUERY_KEY, 'options'],
    queryFn: fetchOfficeOptions,
    staleTime: 60_000,
  });
}

export function useOfficeSummary() {
  return useQuery({
    queryKey: [OFFICES_QUERY_KEY, 'summary'],
    queryFn: fetchOfficeSummary,
  });
}

export function useSaveOffice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveOffice,
    // Offices, vehicles, mechanics and records all show data of each other
    // (counts, costs, last maintenance), so every list is refreshed.
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function useDeleteOffice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/offices/${id}/`),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

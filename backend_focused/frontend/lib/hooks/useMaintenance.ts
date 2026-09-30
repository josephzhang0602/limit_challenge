'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { MaintenancePayload } from '@/lib/types';

async function saveMaintenanceRecord({ id, ...payload }: MaintenancePayload & { id?: number }) {
  const response = id
    ? await apiClient.put(`/maintenance-records/${id}/`, payload)
    : await apiClient.post('/maintenance-records/', payload);
  return response.data;
}

export function useSaveMaintenanceRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveMaintenanceRecord,
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function useDeleteMaintenanceRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/maintenance-records/${id}/`),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

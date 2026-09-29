'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import {
  DuplicateCheckParams,
  DuplicateField,
  Paginated,
  Vehicle,
  VehicleDetail,
  VehicleListParams,
  VehiclePayload,
} from '@/lib/types';

const VEHICLES_QUERY_KEY = 'vehicles';

async function fetchVehicles({ overdue, ...filters }: VehicleListParams) {
  // Both endpoints accept the same filters and return the same shape.
  const url = overdue ? '/vehicles/needing-maintenance/' : '/vehicles/';

  // Leave out the filters that are not set: `?make=` would be sent as a filter.
  const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''));

  const response = await apiClient.get<Paginated<Vehicle>>(url, { params });
  return response.data;
}

async function fetchVehicleDetail(id: string) {
  const response = await apiClient.get<VehicleDetail>(`/vehicles/${id}/`);
  return response.data;
}

async function fetchDuplicates(params: DuplicateCheckParams) {
  const response = await apiClient.get<{ conflicts: DuplicateField[] }>(
    '/vehicles/duplicate-check/',
    { params },
  );
  return response.data.conflicts;
}

async function saveVehicle({ id, ...payload }: VehiclePayload & { id?: number }) {
  const response = id
    ? await apiClient.put<Vehicle>(`/vehicles/${id}/`, payload)
    : await apiClient.post<Vehicle>('/vehicles/', payload);
  return response.data;
}

async function assignVehicle({ id, officeId }: { id: number; officeId: number }) {
  const response = await apiClient.post<Vehicle>(`/vehicles/${id}/assign/`, {
    office_id: officeId,
  });
  return response.data;
}

export function useVehicleList(params: VehicleListParams) {
  return useQuery({
    queryKey: [VEHICLES_QUERY_KEY, 'list', params],
    queryFn: () => fetchVehicles(params),
    // Keep showing the current rows while the next page or filter loads,
    // instead of replacing the table with a spinner on every change.
    placeholderData: keepPreviousData,
  });
}

export function useVehicleDetail(id: string) {
  return useQuery({
    queryKey: [VEHICLES_QUERY_KEY, 'detail', id],
    queryFn: () => fetchVehicleDetail(id),
    enabled: Boolean(id),
  });
}

export function useDuplicateCheck(params: DuplicateCheckParams) {
  return useQuery({
    queryKey: [VEHICLES_QUERY_KEY, 'duplicate-check', params],
    queryFn: () => fetchDuplicates(params),
    enabled: Boolean(params.vin || params.license_plate),
  });
}

export function useSaveVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveVehicle,
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/vehicles/${id}/`),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function useAssignVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: assignVehicle,
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

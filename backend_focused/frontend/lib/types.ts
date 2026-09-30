// Field names match the API (snake_case), so there is no mapping layer to maintain.

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type Role = 'manager' | 'viewer';

export interface User {
  id: number;
  username: string;
  name: string;
  role: Role;
}

/** The answer of the login, which is also what the browser stores. */
export interface Session {
  access: string;
  refresh: string;
  user: User;
}

export interface Office {
  id: number;
  name: string;
  city: string;
}

export interface OfficeSummary extends Office {
  active_vehicle_count: number;
  maintenance_cost_last_year: number;
  last_maintenance: string | null;
}

export interface OfficePayload {
  name: string;
  city: string;
}

export interface Mechanic {
  id: number;
  name: string;
  certification_number: string;
  is_active: boolean;
}

export interface MechanicWorkload extends Mechanic {
  maintenance_count: number;
  total_cost: number;
}

export interface MechanicPayload {
  name: string;
  certification_number: string;
  is_active: boolean;
}

export interface Vehicle {
  id: number;
  vin: string;
  license_plate: string;
  make: string;
  model: string;
  year: number;
  is_active: boolean;
  office: Office;
  last_maintenance: string | null;
  created_at: string;
  updated_at: string;
}

export interface VehiclePayload {
  vin: string;
  license_plate: string;
  make: string;
  model: string;
  // Optional: a field the user left empty is not sent, and the API answers
  // "This field is required." for it.
  year?: number;
  office_id?: number;
  is_active: boolean;
}

export type MaintenanceType =
  | 'oil_change'
  | 'tire_service'
  | 'brake_service'
  | 'inspection'
  | 'engine_repair'
  | 'transmission'
  | 'electrical'
  | 'other';

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  oil_change: 'Oil change',
  tire_service: 'Tire service',
  brake_service: 'Brake service',
  inspection: 'Inspection',
  engine_repair: 'Engine repair',
  transmission: 'Transmission',
  electrical: 'Electrical',
  other: 'Other',
};

export interface MaintenanceEntry {
  id: number;
  maintenance_date: string;
  maintenance_type: MaintenanceType;
  cost: number;
  notes: string;
  mechanic: Mechanic;
}

export interface MaintenancePayload {
  vehicle_id: number;
  mechanic_id?: number;
  maintenance_date?: string;
  maintenance_type?: MaintenanceType;
  cost?: string;
  notes: string;
}

export interface VehicleDetail extends Vehicle {
  maintenance_history: MaintenanceEntry[];
}

export interface VehicleListParams {
  office: string;
  is_active: string;
  make: string;
  model: string;
  maintained_from: string;
  maintained_to: string;
  mechanic_certification: string;
  ordering: string;
  /** Show only the vehicles that need maintenance. */
  overdue: boolean;
  page: number;
  page_size: number;
}

export type DuplicateField = 'vin' | 'license_plate';

export interface DuplicateCheckParams {
  vin?: string;
  license_plate?: string;
  exclude_id?: number;
}

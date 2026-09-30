import { Vehicle } from '@/lib/types';

/** The same interval as the API uses for "vehicles needing maintenance". */
export const MAINTENANCE_INTERVAL_DAYS = 365;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days from an API date (`YYYY-MM-DD`) to `today`. */
export function daysSince(date: string, today = new Date()) {
  const [year, month, day] = date.split('-').map(Number);
  const then = Date.UTC(year, month - 1, day);
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((now - then) / DAY_MS);
}

/**
 * Whether a vehicle needs maintenance: it is active, and it was never serviced
 * or was last serviced more than 365 days ago. The same rule as the API, so
 * the badge in a list agrees with the "Needs maintenance" filter.
 */
export function isOverdue(
  vehicle: Pick<Vehicle, 'is_active' | 'last_maintenance'>,
  today = new Date(),
) {
  if (!vehicle.is_active) {
    return false;
  }
  if (!vehicle.last_maintenance) {
    return true;
  }
  return daysSince(vehicle.last_maintenance, today) > MAINTENANCE_INTERVAL_DAYS;
}

export function vehicleName(vehicle: Pick<Vehicle, 'year' | 'make' | 'model'>) {
  return `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
}

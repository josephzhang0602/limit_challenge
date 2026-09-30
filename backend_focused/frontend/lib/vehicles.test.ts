import { describe, expect, it } from 'vitest';

import { daysSince, isOverdue, vehicleName } from '@/lib/vehicles';

const TODAY = new Date(2026, 8, 30); // September 30, 2026, local time

describe('daysSince', () => {
  it('counts whole days', () => {
    expect(daysSince('2026-09-30', TODAY)).toBe(0);
    expect(daysSince('2026-09-29', TODAY)).toBe(1);
    expect(daysSince('2025-09-30', TODAY)).toBe(365);
  });
});

describe('isOverdue', () => {
  it('is true for an active vehicle that was never serviced', () => {
    expect(isOverdue({ is_active: true, last_maintenance: null }, TODAY)).toBe(true);
  });

  it('uses "more than 365 days", like the API', () => {
    expect(isOverdue({ is_active: true, last_maintenance: '2025-09-30' }, TODAY)).toBe(false);
    expect(isOverdue({ is_active: true, last_maintenance: '2025-09-29' }, TODAY)).toBe(true);
  });

  it('is never true for an inactive vehicle', () => {
    expect(isOverdue({ is_active: false, last_maintenance: null }, TODAY)).toBe(false);
    expect(isOverdue({ is_active: false, last_maintenance: '2020-01-01' }, TODAY)).toBe(false);
  });
});

describe('vehicleName', () => {
  it('puts the year first', () => {
    expect(vehicleName({ year: 2024, make: 'Ford', model: 'Transit' })).toBe('2024 Ford Transit');
  });
});

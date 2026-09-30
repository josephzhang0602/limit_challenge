import { describe, expect, it } from 'vitest';

import { formatCurrency, formatDate, optionalNumber, todayIso } from '@/lib/format';

describe('formatDate', () => {
  it('keeps the day that the API sent, in any time zone', () => {
    // `new Date('2026-03-01')` would be February 28 in the Americas.
    expect(formatDate('2026-03-01')).toBe('Mar 1, 2026');
    expect(formatDate('2025-12-31')).toBe('Dec 31, 2025');
  });

  it('says "Never" when there is no date', () => {
    expect(formatDate(null)).toBe('Never');
  });
});

describe('formatCurrency', () => {
  it('shows two decimals and separates the thousands', () => {
    expect(formatCurrency(81250.5)).toBe('$81,250.50');
    expect(formatCurrency(0)).toBe('$0.00');
  });
});

describe('optionalNumber', () => {
  it('converts the text of an input', () => {
    expect(optionalNumber('2024')).toBe(2024);
    expect(optionalNumber(' 7 ')).toBe(7);
  });

  it('gives undefined for an empty input, so the field is not sent', () => {
    expect(optionalNumber('')).toBeUndefined();
    expect(optionalNumber('   ')).toBeUndefined();
  });
});

describe('todayIso', () => {
  it('has the format of a date input', () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

const currencyFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function formatCurrency(value: number) {
  return currencyFormat.format(value);
}

/**
 * Format an API date (`YYYY-MM-DD`).
 *
 * `new Date('2026-03-01')` is midnight in UTC, which is still the previous day
 * in the Americas. Building the date from its parts keeps the day as written.
 */
export function formatDate(value: string | null) {
  if (!value) {
    return 'Never';
  }
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Format an API date and time (ISO 8601), in the time zone of the user. */
export function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** The number in a form input, or `undefined` when the input is empty. */
export function optionalNumber(value: string) {
  return value.trim() === '' ? undefined : Number(value);
}

/** Today as `YYYY-MM-DD`, in the time zone of the user. */
export function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

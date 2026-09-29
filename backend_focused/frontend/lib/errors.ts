import axios from 'axios';

export interface ApiError {
  /** A sentence that can be shown to the user as it is. */
  message: string;
  /** Messages of the API for each field, for example { vin: '...' }. */
  fieldErrors: Record<string, string>;
  status?: number;
}

/**
 * Convert whatever a failed request threw into something the UI can show.
 *
 * The API answers validation errors with `{ field: ["message"] }`, and other
 * errors with `{ detail: "message" }`.
 */
export function parseApiError(error: unknown): ApiError {
  if (!axios.isAxiosError(error)) {
    return { message: 'Something went wrong. Please try again.', fieldErrors: {} };
  }

  if (!error.response) {
    return {
      message: 'Cannot reach the server. Check that the API is running and try again.',
      fieldErrors: {},
    };
  }

  const { status, data } = error.response;
  const fieldErrors: Record<string, string> = {};
  let message = '';

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    for (const [key, value] of Object.entries(data)) {
      const text = Array.isArray(value) ? value.join(' ') : String(value);
      if (key === 'detail' || key === 'non_field_errors') {
        message = text;
      } else {
        fieldErrors[key] = text;
      }
    }
  }

  if (!message) {
    message =
      Object.keys(fieldErrors).length > 0
        ? 'Some values are not valid.'
        : `The request failed (error ${status}).`;
  }

  return { message, fieldErrors, status };
}

import { AxiosError, AxiosHeaders, AxiosResponse } from 'axios';
import { describe, expect, it } from 'vitest';

import { parseApiError } from '@/lib/errors';

/** An error like the ones axios throws when the API answers with `status`. */
function apiError(status: number, data: unknown) {
  const response = {
    status,
    data,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  } as AxiosResponse;
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', response.config, null, response);
}

describe('parseApiError', () => {
  it('puts the message of each field under its name', () => {
    const parsed = parseApiError(
      apiError(400, { vin: ['VIN must be 17 characters.'], year: ['Too late.', 'Too big.'] }),
    );

    expect(parsed.status).toBe(400);
    expect(parsed.fieldErrors).toEqual({
      vin: 'VIN must be 17 characters.',
      year: 'Too late. Too big.',
    });
    expect(parsed.message).toBe('Some values are not valid.');
  });

  it('uses detail as the message', () => {
    const parsed = parseApiError(apiError(409, { detail: 'This record cannot be deleted.' }));

    expect(parsed.message).toBe('This record cannot be deleted.');
    expect(parsed.fieldErrors).toEqual({});
  });

  it('uses the errors that belong to no field as the message', () => {
    const parsed = parseApiError(apiError(400, { non_field_errors: ['Provide vin.'] }));

    expect(parsed.message).toBe('Provide vin.');
  });

  it('leaves out the keys that are meant for programs', () => {
    const parsed = parseApiError(
      apiError(401, { detail: 'Token is invalid', code: 'token_not_valid', messages: [{}] }),
    );

    expect(parsed.message).toBe('Token is invalid');
    expect(parsed.fieldErrors).toEqual({});
  });

  it('explains that the server did not answer', () => {
    const parsed = parseApiError(new AxiosError('Network Error', 'ERR_NETWORK'));

    expect(parsed.message).toMatch(/Cannot reach the server/);
    expect(parsed.status).toBeUndefined();
  });

  it('handles an answer that is not JSON', () => {
    const parsed = parseApiError(apiError(502, '<html>Bad gateway</html>'));

    expect(parsed.message).toBe('The request failed (error 502).');
  });

  it('handles an error that did not come from a request', () => {
    const parsed = parseApiError(new TypeError('x is undefined'));

    expect(parsed.message).toBe('Something went wrong. Please try again.');
  });
});

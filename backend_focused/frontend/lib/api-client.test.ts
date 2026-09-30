import axios, { AxiosError, AxiosHeaders, InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/lib/api-client';
import { readSession, saveSession } from '@/lib/session';
import { Session } from '@/lib/types';

const SESSION: Session = {
  access: 'old-access',
  refresh: 'the-refresh',
  user: { id: 1, username: 'morgan', name: 'Morgan Lee', role: 'manager' },
};

type Handler = (config: InternalAxiosRequestConfig) => { status: number; data: unknown };

/**
 * Replace the network of apiClient. No request leaves the test: the handler
 * decides the answer, and every request is recorded.
 */
function fakeApi(handler: Handler) {
  const requests: { url?: string; authorization: string | undefined }[] = [];

  apiClient.defaults.adapter = async (config) => {
    requests.push({
      url: config.url,
      authorization: config.headers.Authorization as string | undefined,
    });
    const { status, data } = handler(config);
    const response = { status, data, statusText: '', headers: new AxiosHeaders(), config };
    if (status >= 400) {
      throw new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, response);
    }
    return response;
  };

  return requests;
}

/** An API that only accepts the access token `valid`. */
function apiThatAccepts(valid: string): Handler {
  return (config) =>
    config.headers.Authorization === `Bearer ${valid}`
      ? { status: 200, data: { ok: true } }
      : { status: 401, data: { detail: 'Token is invalid' } };
}

describe('apiClient', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends the access token of the session', async () => {
    saveSession(SESSION);
    const requests = fakeApi(apiThatAccepts('old-access'));

    await apiClient.get('/vehicles/');

    expect(requests).toEqual([{ url: '/vehicles/', authorization: 'Bearer old-access' }]);
  });

  it('sends no token when nobody is logged in', async () => {
    const requests = fakeApi(() => ({ status: 200, data: {} }));

    await apiClient.get('/health/');

    expect(requests[0].authorization).toBeUndefined();
  });

  it('gets a new access token when the old one expired, and repeats the request', async () => {
    saveSession(SESSION);
    const requests = fakeApi(apiThatAccepts('new-access'));
    const refresh = vi.spyOn(axios, 'post').mockResolvedValue({ data: { access: 'new-access' } });

    const response = await apiClient.get('/vehicles/');

    expect(response.data).toEqual({ ok: true });
    expect(requests.map((request) => request.authorization)).toEqual([
      'Bearer old-access',
      'Bearer new-access',
    ]);
    expect(refresh).toHaveBeenCalledWith(expect.stringContaining('/auth/refresh/'), {
      refresh: 'the-refresh',
    });
    // The new token is stored, and the rest of the session is kept.
    expect(readSession()).toEqual({ ...SESSION, access: 'new-access' });
  });

  it('refreshes once when several requests fail together', async () => {
    saveSession(SESSION);
    fakeApi(apiThatAccepts('new-access'));
    const refresh = vi.spyOn(axios, 'post').mockResolvedValue({ data: { access: 'new-access' } });

    const responses = await Promise.all([
      apiClient.get('/vehicles/'),
      apiClient.get('/offices/summary/'),
      apiClient.get('/mechanics/workload/'),
    ]);

    expect(responses.map((response) => response.status)).toEqual([200, 200, 200]);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('ends the session when the refresh token is not accepted', async () => {
    saveSession(SESSION);
    fakeApi(apiThatAccepts('new-access'));
    vi.spyOn(axios, 'post').mockRejectedValue(new AxiosError('Request failed'));

    await expect(apiClient.get('/vehicles/')).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(readSession()).toBeNull();
  });

  it('does not repeat a request more than once', async () => {
    saveSession(SESSION);
    // The API rejects every token, including the new one.
    const requests = fakeApi(apiThatAccepts('never'));
    vi.spyOn(axios, 'post').mockResolvedValue({ data: { access: 'new-access' } });

    await expect(apiClient.get('/vehicles/')).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(requests).toHaveLength(2);
  });

  it('does not try to refresh after a failed login', async () => {
    const requests = fakeApi(() => ({ status: 401, data: { detail: 'No active account' } }));
    const refresh = vi.spyOn(axios, 'post');

    await expect(
      apiClient.post('/auth/login/', { username: 'morgan', password: 'wrong' }),
    ).rejects.toMatchObject({ response: { status: 401 } });

    expect(requests).toHaveLength(1);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('leaves other errors alone', async () => {
    saveSession(SESSION);
    fakeApi(() => ({ status: 403, data: { detail: 'Only managers can change data.' } }));
    const refresh = vi.spyOn(axios, 'post');

    await expect(apiClient.delete('/offices/1/')).rejects.toMatchObject({
      response: { status: 403 },
    });

    expect(refresh).not.toHaveBeenCalled();
    expect(readSession()).toEqual(SESSION);
  });
});

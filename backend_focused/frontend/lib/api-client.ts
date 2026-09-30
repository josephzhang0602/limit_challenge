import axios, { InternalAxiosRequestConfig } from 'axios';

import { clearSession, readSession, saveSession } from '@/lib/session';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api';

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15_000,
});

type RetriableRequest = InternalAxiosRequestConfig & { retried?: boolean };

// Every request carries the access token of the session.
apiClient.interceptors.request.use((config) => {
  const session = readSession();
  if (session) {
    config.headers.Authorization = `Bearer ${session.access}`;
  }
  return config;
});

let refreshInProgress: Promise<string> | null = null;

async function refreshAccessToken() {
  const session = readSession();
  if (!session) {
    throw new Error('There is no session to refresh.');
  }
  // Plain axios, not apiClient: this request must not go through the
  // interceptors, or a failed refresh would try to refresh itself.
  const response = await axios.post<{ access: string }>(`${apiBaseUrl}/auth/refresh/`, {
    refresh: session.refresh,
  });
  saveSession({ ...session, access: response.data.access });
  return response.data.access;
}

// An access token lives for a few minutes. When the API answers 401, get a new
// one with the refresh token and send the request again. The user notices nothing.
apiClient.interceptors.response.use(undefined, async (error) => {
  const request: RetriableRequest | undefined = error.config;
  const expired = error.response?.status === 401;
  const isAuthRequest = request?.url?.startsWith('/auth/') ?? false;

  if (!expired || !request || request.retried || isAuthRequest || !readSession()) {
    throw error;
  }
  request.retried = true;

  try {
    // A page sends several requests at once and all of them fail together.
    // They share one refresh instead of each asking for its own.
    refreshInProgress ??= refreshAccessToken().finally(() => {
      refreshInProgress = null;
    });
    const access = await refreshInProgress;
    request.headers.Authorization = `Bearer ${access}`;
    return apiClient(request);
  } catch {
    // The refresh token expired or was cancelled: the user has to log in again.
    clearSession();
    throw error;
  }
});

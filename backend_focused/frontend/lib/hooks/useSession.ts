'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useSyncExternalStore } from 'react';

import { apiClient } from '@/lib/api-client';
import {
  clearSession,
  getServerSnapshot,
  getSnapshot,
  parseSession,
  readSession,
  saveSession,
  subscribe,
} from '@/lib/session';
import { Session, User } from '@/lib/types';

export type SessionStatus = 'loading' | 'anonymous' | 'authenticated';

interface SessionState {
  status: SessionStatus;
  user: User | null;
  /** Managers change data. Viewers only read it. */
  canEdit: boolean;
}

/**
 * Who is logged in.
 *
 * The status is `loading` on the server and during the first render in the
 * browser, because only the browser knows the session. Rendering the same
 * thing in both places is what avoids a hydration error.
 */
export function useSession(): SessionState {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return useMemo(() => {
    if (raw === undefined) {
      return { status: 'loading', user: null, canEdit: false };
    }
    const session = parseSession(raw);
    if (!session) {
      return { status: 'anonymous', user: null, canEdit: false };
    }
    return {
      status: 'authenticated',
      user: session.user,
      canEdit: session.user.role === 'manager',
    };
  }, [raw]);
}

async function login(credentials: { username: string; password: string }) {
  const response = await apiClient.post<Session>('/auth/login/', credentials);
  return response.data;
}

export function useLogin() {
  return useMutation({
    mutationFn: login,
    onSuccess: saveSession,
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return async () => {
    const session = readSession();
    clearSession();
    // The next user of this browser must not see the data of this one.
    queryClient.clear();
    if (session) {
      // Cancel the refresh token on the server. The user is logged out here
      // whatever the answer is, so a failure is not reported.
      await apiClient.post('/auth/logout/', { refresh: session.refresh }).catch(() => {});
    }
  };
}

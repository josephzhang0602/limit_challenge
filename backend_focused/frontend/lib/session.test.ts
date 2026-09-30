import { beforeEach, describe, expect, it, vi } from 'vitest';

import { clearSession, parseSession, readSession, saveSession, subscribe } from '@/lib/session';
import { Session } from '@/lib/types';

const SESSION: Session = {
  access: 'access-token',
  refresh: 'refresh-token',
  user: { id: 2, username: 'val', name: 'Val Viewer', role: 'viewer' },
};

describe('session', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('is empty until somebody logs in', () => {
    expect(readSession()).toBeNull();
  });

  it('keeps the session after it is saved, and forgets it after it is cleared', () => {
    saveSession(SESSION);
    expect(readSession()).toEqual(SESSION);

    clearSession();
    expect(readSession()).toBeNull();
  });

  it('tells the subscribers about every change, until they unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);

    saveSession(SESSION);
    clearSession();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    saveSession(SESSION);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('treats damaged or incomplete data as no session', () => {
    expect(parseSession('not json')).toBeNull();
    expect(parseSession(JSON.stringify({ access: 'only-this' }))).toBeNull();
    expect(parseSession(null)).toBeNull();
    expect(parseSession(undefined)).toBeNull();
  });
});

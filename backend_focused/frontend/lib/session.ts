import { Session } from '@/lib/types';

/**
 * The session (tokens and user) of the person who is logged in.
 *
 * It is kept in localStorage, so it survives a reload and is shared by the
 * tabs of the browser. Components read it with `useSession`, and they are
 * told when it changes.
 */
const STORAGE_KEY = 'fleet.session';

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

/** For `useSyncExternalStore`: call `listener` when the session changes. */
export function subscribe(listener: () => void) {
  listeners.add(listener);
  // The `storage` event comes from the other tabs: logging out in one tab
  // logs out in all of them.
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

/** The stored text. A string is returned as it is, so it is stable between renders. */
export function getSnapshot() {
  return window.localStorage.getItem(STORAGE_KEY);
}

/** On the server there is no browser, so the session is not known yet. */
export function getServerSnapshot() {
  return undefined;
}

export function parseSession(raw: string | null | undefined): Session | null {
  if (!raw) {
    return null;
  }
  try {
    const session = JSON.parse(raw) as Session;
    return session.access && session.refresh && session.user ? session : null;
  } catch {
    return null;
  }
}

export function readSession() {
  return typeof window === 'undefined' ? null : parseSession(getSnapshot());
}

export function saveSession(session: Session) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  notify();
}

export function clearSession() {
  window.localStorage.removeItem(STORAGE_KEY);
  notify();
}

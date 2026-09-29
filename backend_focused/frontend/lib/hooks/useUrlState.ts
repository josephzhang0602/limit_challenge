'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/** `null`, `undefined` and `''` remove the parameter from the URL. */
type Changes = Record<string, string | number | null | undefined>;

/**
 * Keep filters and pagination in the query string of the URL.
 *
 * The URL is the only place where this state lives, so a filtered list can be
 * reloaded, bookmarked or shared, and the back button of the browser works.
 */
export function useUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const get = useCallback((key: string) => searchParams.get(key) ?? '', [searchParams]);

  const update = useCallback(
    (changes: Changes) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === undefined || value === '') {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      }

      // A different filter gives a different list, so page 3 of the old list
      // means nothing. Go back to the first page unless the page was the change.
      if (!('page' in changes)) {
        params.delete('page');
      }

      const query = params.toString();
      // `replace` so that every filter change does not add a step to the history.
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  return { get, update, query: searchParams.toString() };
}

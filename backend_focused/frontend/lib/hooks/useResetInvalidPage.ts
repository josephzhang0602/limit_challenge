'use client';

import { useEffect } from 'react';

import { parseApiError } from '@/lib/errors';

/**
 * Go back to the first page when the current page no longer exists.
 *
 * This happens after deleting the only row of the last page, or when opening
 * an old link: the API answers 404 to a page beyond the last one.
 */
export function useResetInvalidPage(error: unknown, page: number, reset: () => void) {
  const pageIsGone = Boolean(error) && page > 1 && parseApiError(error).status === 404;

  useEffect(() => {
    if (pageIsGone) {
      reset();
    }
    // `reset` is a new function on every render; only `pageIsGone` should trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIsGone]);
}

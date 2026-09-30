'use client';

import { CssBaseline, ThemeProvider } from '@mui/material';
import { PropsWithChildren, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import NotificationProvider from '@/components/NotificationProvider';
import { parseApiError } from '@/lib/errors';
import { theme } from '@/lib/theme';

export default function Providers({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            // Retry once when the server failed or could not be reached. A 4xx
            // answer means the request is wrong, and asking again will not fix it.
            retry: (failureCount, error) => {
              const status = parseApiError(error).status;
              return failureCount < 1 && (status === undefined || status >= 500);
            },
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {/* The chosen color scheme is kept in localStorage by Material UI. */}
      <ThemeProvider theme={theme} defaultMode="system">
        <CssBaseline enableColorScheme />
        <NotificationProvider>{children}</NotificationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

'use client';

import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { PropsWithChildren, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import NotificationProvider from '@/components/NotificationProvider';
import { parseApiError } from '@/lib/errors';

function useTheme() {
  return useMemo(
    () =>
      createTheme({
        palette: {
          primary: {
            main: '#0f62fe',
          },
          background: {
            default: '#f5f7fb',
          },
        },
        shape: { borderRadius: 8 },
      }),
    [],
  );
}

export default function Providers({ children }: PropsWithChildren) {
  const theme = useTheme();
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
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <NotificationProvider>{children}</NotificationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

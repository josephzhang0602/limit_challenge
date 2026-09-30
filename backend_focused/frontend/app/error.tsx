'use client';

import { Box, Button, Typography } from '@mui/material';
import { useEffect } from 'react';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Shown when a page fails while it renders. Failed requests do not come here:
 * each list shows its own error with the message of the API.
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // The place to send the error to a tracking service.
    console.error(error);
  }, [error]);

  return (
    <Box textAlign="center" py={10} px={2}>
      <Typography variant="h4" component="h1" gutterBottom>
        Something went wrong
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        The page could not be shown. Your data is safe.
      </Typography>
      <Button variant="contained" onClick={reset}>
        Try again
      </Button>
    </Box>
  );
}

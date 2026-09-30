'use client';

import { Box, Button, Typography } from '@mui/material';
import Link from 'next/link';

export default function NotFound() {
  return (
    <Box textAlign="center" py={10} px={2}>
      <Typography variant="h4" component="h1" gutterBottom>
        Page not found
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        This address does not exist. It may have been typed wrong.
      </Typography>
      <Button component={Link} href="/vehicles" variant="contained">
        Go to vehicles
      </Button>
    </Box>
  );
}

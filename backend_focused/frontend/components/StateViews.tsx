'use client';

import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Skeleton,
  TableCell,
  TableRow,
  Typography,
} from '@mui/material';
import { ReactNode } from 'react';

import { parseApiError } from '@/lib/errors';

/** Placeholder rows shown while the first page of a table loads. */
export function TableSkeleton({ rows = 5, columns }: { rows?: number; columns: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, row) => (
        <TableRow key={row}>
          {Array.from({ length: columns }, (_, column) => (
            <TableCell key={column}>
              <Skeleton />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { message, fieldErrors } = parseApiError(error);
  const details = Object.entries(fieldErrors);

  return (
    <Alert
      severity="error"
      action={
        onRetry && (
          <Button color="inherit" size="small" onClick={onRetry}>
            Try again
          </Button>
        )
      }
    >
      <AlertTitle>{message}</AlertTitle>
      {details.map(([field, text]) => (
        <div key={field}>
          {field.replaceAll('_', ' ')}: {text}
        </div>
      ))}
    </Alert>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Box textAlign="center" py={6} px={2}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      {description && (
        <Typography color="text.secondary" sx={{ mb: action ? 2 : 0 }}>
          {description}
        </Typography>
      )}
      {action}
    </Box>
  );
}

'use client';

import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import {
  Alert,
  AlertTitle,
  Avatar,
  Box,
  Button,
  Skeleton,
  Stack,
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

/** Placeholder cards shown while the first page of a list loads on a phone. */
export function CardListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Stack spacing={1.5} p={2}>
      {Array.from({ length: rows }, (_, row) => (
        <Skeleton key={row} variant="rounded" height={88} />
      ))}
    </Stack>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { message, fieldErrors } = parseApiError(error);
  const details = Object.entries(fieldErrors);

  return (
    <Alert
      severity="error"
      variant="outlined"
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
  icon = <InboxOutlinedIcon />,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <Box textAlign="center" py={7} px={2}>
      <Avatar
        sx={{
          mx: 'auto',
          mb: 2,
          width: 56,
          height: 56,
          bgcolor: 'action.hover',
          color: 'text.secondary',
        }}
      >
        {icon}
      </Avatar>
      <Typography variant="h6" component="h2" gutterBottom>
        {title}
      </Typography>
      {description && (
        <Typography color="text.secondary" sx={{ mb: action ? 2.5 : 0, maxWidth: 420, mx: 'auto' }}>
          {description}
        </Typography>
      )}
      {action}
    </Box>
  );
}

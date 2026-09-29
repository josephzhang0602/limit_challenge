'use client';

import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
} from '@mui/material';
import { FormEvent, PropsWithChildren } from 'react';

interface FormDialogProps {
  title: string;
  submitLabel: string;
  /** A problem that does not belong to one field. */
  error?: string;
  saving: boolean;
  submitDisabled?: boolean;
  onSubmit: () => void;
  onClose: () => void;
}

/** The frame that every create and edit form shares. */
export default function FormDialog({
  title,
  submitLabel,
  error,
  saving,
  submitDisabled = false,
  onSubmit,
  onClose,
  children,
}: PropsWithChildren<FormDialogProps>) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <Dialog open onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      {/* noValidate: the API validates, so the messages are the same everywhere. */}
      <form onSubmit={handleSubmit} noValidate>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            {children}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={saving} disabled={submitDisabled}>
            {submitLabel}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

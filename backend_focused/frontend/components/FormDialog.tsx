'use client';

import CloseIcon from '@mui/icons-material/Close';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
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

/** The frame that every create and edit form shares. On a phone it fills the screen. */
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
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <Dialog
      open
      onClose={saving ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={fullScreen}
      aria-labelledby="form-dialog-title"
    >
      {/* noValidate: the API validates, so the messages are the same everywhere. */}
      <form onSubmit={handleSubmit} noValidate style={{ display: 'contents' }}>
        <DialogTitle
          id="form-dialog-title"
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1.5 }}
        >
          {title}
          <IconButton aria-label="Close" onClick={onClose} disabled={saving}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3}>
            {error && <Alert severity="error">{error}</Alert>}
            {children}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={saving} color="inherit">
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

/** A titled group of fields inside a form. */
export function FormSection({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <Box component="fieldset" sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
      <Typography
        component="legend"
        variant="overline"
        color="text.secondary"
        sx={{ display: 'block', mb: 1 }}
      >
        {title}
      </Typography>
      <Stack spacing={2}>{children}</Stack>
    </Box>
  );
}

'use client';

import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { ReactNode } from 'react';

interface ConfirmDialogProps {
  title: string;
  /** What will happen. Name the thing, so the user knows which one. */
  message: ReactNode;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open
      onClose={loading ? undefined : onCancel}
      maxWidth="xs"
      fullWidth
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
    >
      <DialogTitle id="confirm-title" sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ bgcolor: 'error.main', width: 36, height: 36 }}>
          <WarningAmberRoundedIcon fontSize="small" />
        </Avatar>
        {title}
      </DialogTitle>
      <DialogContent>
        <Box id="confirm-message">
          <Typography color="text.secondary" component="div">
            {message}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} disabled={loading} color="inherit">
          Cancel
        </Button>
        <Button onClick={onConfirm} color="error" variant="contained" loading={loading}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

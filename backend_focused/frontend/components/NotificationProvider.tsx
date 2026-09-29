'use client';

import { Alert, Snackbar } from '@mui/material';
import { PropsWithChildren, createContext, useCallback, useContext, useState } from 'react';

type Severity = 'success' | 'error';

interface Notification {
  message: string;
  severity: Severity;
}

type Notify = (message: string, severity?: Severity) => void;

const NotificationContext = createContext<Notify>(() => {});

/** Show a short message at the bottom of the screen, from any component. */
export function useNotify() {
  return useContext(NotificationContext);
}

export default function NotificationProvider({ children }: PropsWithChildren) {
  const [notification, setNotification] = useState<Notification | null>(null);
  const [open, setOpen] = useState(false);

  const notify = useCallback<Notify>((message, severity = 'success') => {
    setNotification({ message, severity });
    setOpen(true);
  }, []);

  return (
    <NotificationContext.Provider value={notify}>
      {children}
      <Snackbar
        open={open}
        // Errors stay longer: they usually need to be read twice.
        autoHideDuration={notification?.severity === 'error' ? 8000 : 4000}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={notification?.severity} variant="filled" onClose={() => setOpen(false)}>
          {notification?.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
}

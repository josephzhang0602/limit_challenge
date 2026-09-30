'use client';

import {
  AppBar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Toolbar,
  Typography,
} from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { PropsWithChildren, useEffect } from 'react';

import { useLogout, useSession } from '@/lib/hooks/useSession';

const LOGIN_PATH = '/login';

const NAV_ITEMS = [
  { label: 'Vehicles', href: '/vehicles' },
  { label: 'Offices', href: '/offices' },
  { label: 'Mechanics', href: '/mechanics' },
];

function FullPageSpinner() {
  return (
    <Box display="flex" alignItems="center" justifyContent="center" minHeight="100vh">
      <CircularProgress aria-label="Loading" />
    </Box>
  );
}

/**
 * The frame of every page, and the guard of the application: a page is only
 * shown to a user who is logged in.
 *
 * This guard is for the experience of the user. What protects the data is the
 * API, which rejects every request without a valid token.
 */
export default function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { status, user } = useSession();
  const logout = useLogout();

  const onLoginPage = pathname === LOGIN_PATH;
  const mustLogIn = status === 'anonymous' && !onLoginPage;

  useEffect(() => {
    if (mustLogIn) {
      // Also reached when the session ends by itself, so clear the data here too.
      queryClient.clear();
      // Remember the page, to come back to it after the login.
      const next = window.location.pathname + window.location.search;
      router.replace(`${LOGIN_PATH}?next=${encodeURIComponent(next)}`);
    }
  }, [mustLogIn, router, queryClient]);

  if (onLoginPage) {
    return <>{children}</>;
  }

  if (status !== 'authenticated') {
    return <FullPageSpinner />;
  }

  return (
    <Box display="flex" flexDirection="column" minHeight="100vh">
      <AppBar
        position="sticky"
        color="inherit"
        elevation={0}
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ gap: 1 }}>
            <Typography variant="h6" component="span" sx={{ fontWeight: 700, mr: 3 }}>
              Fleet Tracker
            </Typography>
            <Box component="nav" display="flex" gap={0.5} flexGrow={1}>
              {NAV_ITEMS.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <Button
                    key={item.href}
                    component={Link}
                    href={item.href}
                    color={active ? 'primary' : 'inherit'}
                    aria-current={active ? 'page' : undefined}
                    sx={{ fontWeight: active ? 700 : 400 }}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </Box>
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {user?.name}
            </Typography>
            <Chip
              size="small"
              variant="outlined"
              label={user?.role === 'manager' ? 'Manager' : 'Read only'}
            />
            <Button color="inherit" onClick={logout}>
              Log out
            </Button>
          </Toolbar>
        </Container>
      </AppBar>

      <Container component="main" maxWidth="lg" sx={{ py: 4, flexGrow: 1 }}>
        {children}
      </Container>
    </Box>
  );
}

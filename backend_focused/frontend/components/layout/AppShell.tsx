'use client';

import MenuIcon from '@mui/icons-material/Menu';
import {
  AppBar,
  Box,
  CircularProgress,
  Drawer,
  IconButton,
  Toolbar,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { PropsWithChildren, useEffect, useState } from 'react';

import { useSession } from '@/lib/hooks/useSession';

import ColorModeButton from './ColorModeButton';
import Sidebar from './Sidebar';
import UserMenu from './UserMenu';

const LOGIN_PATH = '/login';
export const SIDEBAR_WIDTH = 248;

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
  const { status } = useSession();
  const theme = useTheme();
  // Pages are only rendered in the browser (after the session is known), so
  // the width of the screen is known too.
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'), { noSsr: true });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);

  const onLoginPage = pathname === LOGIN_PATH;
  const mustLogIn = status === 'anonymous' && !onLoginPage;

  // Close the menu of a phone after a navigation.
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMobileOpen(false);
  }

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
    <Box display="flex" minHeight="100vh" width="100%">
      <Box component="aside" sx={{ width: { md: SIDEBAR_WIDTH }, flexShrink: 0 }}>
        {isDesktop ? (
          <Drawer
            variant="permanent"
            open
            slotProps={{ paper: { sx: { width: SIDEBAR_WIDTH, boxSizing: 'border-box' } } }}
          >
            <Sidebar />
          </Drawer>
        ) : (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            slotProps={{ paper: { sx: { width: SIDEBAR_WIDTH } } }}
          >
            <Sidebar />
          </Drawer>
        )}
      </Box>

      <Box flexGrow={1} minWidth={0} display="flex" flexDirection="column">
        <AppBar
          position="sticky"
          color="inherit"
          elevation={0}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Toolbar sx={{ gap: 1 }}>
            {!isDesktop && (
              <IconButton edge="start" aria-label="Open menu" onClick={() => setMobileOpen(true)}>
                <MenuIcon />
              </IconButton>
            )}
            <Box flexGrow={1} />
            <ColorModeButton />
            <UserMenu />
          </Toolbar>
        </AppBar>

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            px: { xs: 2, sm: 3, lg: 4 },
            py: { xs: 3, md: 4 },
            maxWidth: 1400,
            width: '100%',
            mx: 'auto',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}

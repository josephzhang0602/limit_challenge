'use client';

import { AppBar, Box, Button, Container, Toolbar, Typography } from '@mui/material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PropsWithChildren } from 'react';

const NAV_ITEMS = [
  { label: 'Vehicles', href: '/vehicles' },
  { label: 'Offices', href: '/offices' },
  { label: 'Mechanics', href: '/mechanics' },
];

export default function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();

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
            <Box component="nav" display="flex" gap={0.5}>
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
          </Toolbar>
        </Container>
      </AppBar>

      <Container component="main" maxWidth="lg" sx={{ py: 4, flexGrow: 1 }}>
        {children}
      </Container>
    </Box>
  );
}

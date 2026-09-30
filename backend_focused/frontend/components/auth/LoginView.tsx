'use client';

import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useEffect } from 'react';

import Logo from '@/components/layout/Logo';
import { useForm } from '@/lib/hooks/useForm';
import { useLogin, useSession } from '@/lib/hooks/useSession';

const HOME_PATH = '/dashboard';

/**
 * Where to go after the login.
 *
 * `next` comes from the URL, so anybody can write anything in it. Only a path
 * of this site is accepted: `//evil.com` and `https://evil.com` are not.
 */
function safeDestination(next: string | null) {
  if (next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/login')) {
    return next;
  }
  return HOME_PATH;
}

export default function LoginView() {
  const router = useRouter();
  const destination = safeDestination(useSearchParams().get('next'));
  const { status } = useSession();
  const login = useLogin();
  const form = useForm({ username: '', password: '' });

  // Also true for a user who opens the login page while logged in.
  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(destination);
    }
  }, [status, destination, router]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    login.mutate(form.values, { onError: form.showApiError });
  };

  return (
    <Box
      component="main"
      display="flex"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      px={2}
      py={4}
    >
      <Card variant="outlined" sx={{ width: '100%', maxWidth: 400 }}>
        <CardContent sx={{ p: 4 }}>
          <form onSubmit={handleSubmit} noValidate>
            <Stack spacing={2.5}>
              <Logo />
              <div>
                <Typography variant="h5" component="h1">
                  Log in
                </Typography>
                <Typography color="text.secondary">
                  Vehicles, offices and maintenance of the fleet.
                </Typography>
              </div>

              {form.formError && <Alert severity="error">{form.formError}</Alert>}

              <TextField
                label="Username"
                value={form.values.username}
                onChange={(event) => form.setField('username', event.target.value)}
                autoComplete="username"
                autoFocus
                required
                fullWidth
                {...form.errorProps('username')}
              />
              <TextField
                label="Password"
                type="password"
                value={form.values.password}
                onChange={(event) => form.setField('password', event.target.value)}
                autoComplete="current-password"
                required
                fullWidth
                {...form.errorProps('password')}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                loading={login.isPending || status === 'authenticated'}
                fullWidth
              >
                Log in
              </Button>

              {process.env.NODE_ENV === 'development' && (
                <Typography variant="body2" color="text.secondary">
                  Demo users: <strong>manager</strong> can change data, <strong>viewer</strong> can
                  only read. The password is in SOLUTION.md.
                </Typography>
              )}
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}

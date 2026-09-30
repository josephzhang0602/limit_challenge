import { Suspense } from 'react';

import LoginView from '@/components/auth/LoginView';

export default function LoginPage() {
  // The view reads the query string, which Next.js requires to be inside Suspense.
  return (
    <Suspense>
      <LoginView />
    </Suspense>
  );
}

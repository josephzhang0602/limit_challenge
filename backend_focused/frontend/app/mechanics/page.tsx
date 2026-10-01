import { connection } from 'next/server';
import { Suspense } from 'react';

import MechanicsView from '@/components/mechanics/MechanicsView';

export default async function MechanicsPage() {
  // Render on each request: the page number lives in the query string (see
  // app/vehicles/page.tsx).
  await connection();

  // The view reads the query string, which Next.js requires to be inside Suspense.
  return (
    <Suspense>
      <MechanicsView />
    </Suspense>
  );
}

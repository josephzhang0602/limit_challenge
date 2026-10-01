import { connection } from 'next/server';
import { Suspense } from 'react';

import VehiclesView from '@/components/vehicles/VehiclesView';

export default async function VehiclesPage() {
  // Render on each request, not once at build time. The filters live in the
  // query string; a page built without it loses URL updates when it is opened
  // with filters already in the address.
  await connection();

  // The view reads the query string, which Next.js requires to be inside Suspense.
  return (
    <Suspense>
      <VehiclesView />
    </Suspense>
  );
}

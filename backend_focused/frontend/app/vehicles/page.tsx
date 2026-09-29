import { Suspense } from 'react';

import VehiclesView from '@/components/vehicles/VehiclesView';

export default function VehiclesPage() {
  // The view reads the query string, which Next.js requires to be inside Suspense.
  return (
    <Suspense>
      <VehiclesView />
    </Suspense>
  );
}

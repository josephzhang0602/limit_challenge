import { Suspense } from 'react';

import VehicleDetailView from '@/components/vehicles/VehicleDetailView';

export default function VehicleDetailPage() {
  return (
    <Suspense>
      <VehicleDetailView />
    </Suspense>
  );
}

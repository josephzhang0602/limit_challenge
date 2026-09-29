import { Suspense } from 'react';

import MechanicsView from '@/components/mechanics/MechanicsView';

export default function MechanicsPage() {
  // The view reads the query string, which Next.js requires to be inside Suspense.
  return (
    <Suspense>
      <MechanicsView />
    </Suspense>
  );
}

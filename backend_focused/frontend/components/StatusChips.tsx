'use client';

import { Chip, ChipProps } from '@mui/material';

import { isOverdue } from '@/lib/vehicles';
import { Vehicle } from '@/lib/types';

type Size = ChipProps['size'];

export function ActiveChip({ active, size = 'small' }: { active: boolean; size?: Size }) {
  return (
    <Chip
      size={size}
      variant="outlined"
      label={active ? 'Active' : 'Inactive'}
      color={active ? 'success' : 'default'}
    />
  );
}

/** "Overdue" next to a vehicle that needs maintenance, nothing otherwise. */
export function OverdueChip({
  vehicle,
  size = 'small',
}: {
  vehicle: Pick<Vehicle, 'is_active' | 'last_maintenance'>;
  size?: Size;
}) {
  if (!isOverdue(vehicle)) {
    return null;
  }
  return <Chip size={size} color="warning" label="Overdue" />;
}

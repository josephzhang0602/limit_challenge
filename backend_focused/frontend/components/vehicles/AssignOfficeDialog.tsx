'use client';

import { MenuItem, TextField, Typography } from '@mui/material';

import FormDialog from '@/components/FormDialog';
import { useNotify } from '@/components/NotificationProvider';
import { useForm } from '@/lib/hooks/useForm';
import { useOfficeOptions } from '@/lib/hooks/useOffices';
import { useAssignVehicle } from '@/lib/hooks/useVehicles';
import { Vehicle } from '@/lib/types';

interface AssignOfficeDialogProps {
  vehicle: Vehicle;
  onClose: () => void;
}

export default function AssignOfficeDialog({ vehicle, onClose }: AssignOfficeDialogProps) {
  const notify = useNotify();
  const offices = useOfficeOptions();
  const assignVehicle = useAssignVehicle();
  const form = useForm({ office_id: '' });

  // Moving a vehicle to the office where it already is makes no sense.
  const destinations = offices.data?.filter((office) => office.id !== vehicle.office.id);

  const handleSubmit = () => {
    assignVehicle.mutate(
      { id: vehicle.id, officeId: Number(form.values.office_id) },
      {
        onSuccess: (saved) => {
          notify(`The vehicle was moved to ${saved.office.name}.`);
          onClose();
        },
        onError: form.showApiError,
      },
    );
  };

  return (
    <FormDialog
      title="Move to another office"
      submitLabel="Move vehicle"
      error={form.formError}
      saving={assignVehicle.isPending}
      submitDisabled={form.values.office_id === ''}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <Typography color="text.secondary">
        {vehicle.make} {vehicle.model} is now assigned to <strong>{vehicle.office.name}</strong>.
      </Typography>
      <TextField
        select
        label="New office"
        value={destinations ? form.values.office_id : ''}
        onChange={(event) => form.setField('office_id', event.target.value)}
        required
        fullWidth
        disabled={offices.isPending}
        {...form.errorProps(
          'office_id',
          destinations?.length === 0 ? 'There is no other office.' : undefined,
        )}
      >
        {(destinations ?? []).map((office) => (
          <MenuItem key={office.id} value={String(office.id)}>
            {office.name} ({office.city})
          </MenuItem>
        ))}
      </TextField>
    </FormDialog>
  );
}

'use client';

import { Box, FormControlLabel, MenuItem, Switch, TextField } from '@mui/material';

import FormDialog from '@/components/FormDialog';
import { useNotify } from '@/components/NotificationProvider';
import { optionalNumber } from '@/lib/format';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { useForm } from '@/lib/hooks/useForm';
import { useOfficeOptions } from '@/lib/hooks/useOffices';
import { useDuplicateCheck, useSaveVehicle } from '@/lib/hooks/useVehicles';
import { Vehicle } from '@/lib/types';

const VIN_LENGTH = 17;

interface VehicleFormDialogProps {
  /** The vehicle to edit. Leave it out to create a new one. */
  vehicle?: Vehicle;
  onClose: () => void;
}

export default function VehicleFormDialog({ vehicle, onClose }: VehicleFormDialogProps) {
  const notify = useNotify();
  const offices = useOfficeOptions();
  const saveVehicle = useSaveVehicle();
  const form = useForm({
    vin: vehicle?.vin ?? '',
    license_plate: vehicle?.license_plate ?? '',
    make: vehicle?.make ?? '',
    model: vehicle?.model ?? '',
    year: vehicle ? String(vehicle.year) : '',
    office_id: vehicle ? String(vehicle.office.id) : '',
    is_active: vehicle?.is_active ?? true,
  });
  const { values } = form;

  // Ask the API about duplicates while the user types, before they submit.
  const vin = useDebouncedValue(values.vin.trim());
  const plate = useDebouncedValue(values.license_plate.trim());
  const duplicates = useDuplicateCheck({
    // An incomplete VIN cannot be a duplicate, so it is not worth a request.
    vin: vin.length === VIN_LENGTH ? vin : undefined,
    license_plate: plate || undefined,
    exclude_id: vehicle?.id,
  });
  const conflicts = duplicates.data ?? [];
  // The answer is about the value that was checked. Once the user types
  // something else, it says nothing about what is in the field now.
  const vinTaken = conflicts.includes('vin') && vin === values.vin.trim();
  // Two vehicles may share a plate as long as only one of them is active.
  const plateTaken =
    conflicts.includes('license_plate') &&
    plate === values.license_plate.trim() &&
    values.is_active;

  const handleSubmit = () => {
    saveVehicle.mutate(
      {
        id: vehicle?.id,
        vin: values.vin,
        license_plate: values.license_plate,
        make: values.make,
        model: values.model,
        year: optionalNumber(values.year),
        office_id: optionalNumber(values.office_id),
        is_active: values.is_active,
      },
      {
        onSuccess: (saved) => {
          const name = `${saved.make} ${saved.model}`;
          notify(vehicle ? `${name} was updated.` : `${name} was created.`);
          onClose();
        },
        onError: form.showApiError,
      },
    );
  };

  const vinProps = vinTaken
    ? { error: true, helperText: 'Another vehicle already has this VIN.' }
    : form.errorProps('vin', `${values.vin.trim().length} of ${VIN_LENGTH} characters`);

  const plateProps = plateTaken
    ? { error: true, helperText: 'Another active vehicle already uses this plate.' }
    : form.errorProps('license_plate');

  return (
    <FormDialog
      title={vehicle ? 'Edit vehicle' : 'New vehicle'}
      submitLabel={vehicle ? 'Save changes' : 'Create vehicle'}
      error={form.formError}
      saving={saveVehicle.isPending}
      submitDisabled={vinTaken || plateTaken}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <TextField
        label="VIN"
        value={values.vin}
        onChange={(event) => form.setField('vin', event.target.value.toUpperCase())}
        required
        autoFocus
        fullWidth
        slotProps={{ htmlInput: { maxLength: VIN_LENGTH, style: { fontFamily: 'monospace' } } }}
        {...vinProps}
      />
      <TextField
        label="License plate"
        value={values.license_plate}
        onChange={(event) => form.setField('license_plate', event.target.value.toUpperCase())}
        required
        fullWidth
        {...plateProps}
      />
      <Box display="grid" gap={2} gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr 120px' }}>
        <TextField
          label="Make"
          value={values.make}
          onChange={(event) => form.setField('make', event.target.value)}
          required
          {...form.errorProps('make')}
        />
        <TextField
          label="Model"
          value={values.model}
          onChange={(event) => form.setField('model', event.target.value)}
          required
          {...form.errorProps('model')}
        />
        <TextField
          label="Year"
          type="number"
          value={values.year}
          onChange={(event) => form.setField('year', event.target.value)}
          required
          {...form.errorProps('year')}
        />
      </Box>
      <TextField
        select
        label="Office"
        value={offices.data ? values.office_id : ''}
        onChange={(event) => form.setField('office_id', event.target.value)}
        required
        fullWidth
        disabled={offices.isPending}
        {...form.errorProps(
          'office_id',
          offices.data?.length === 0 ? 'Create an office first.' : undefined,
        )}
      >
        {(offices.data ?? []).map((office) => (
          <MenuItem key={office.id} value={String(office.id)}>
            {office.name} ({office.city})
          </MenuItem>
        ))}
      </TextField>
      <FormControlLabel
        control={
          <Switch
            checked={values.is_active}
            onChange={(event) => form.setField('is_active', event.target.checked)}
          />
        }
        label={values.is_active ? 'Active' : 'Inactive'}
      />
    </FormDialog>
  );
}

'use client';

import { Box, InputAdornment, MenuItem, TextField } from '@mui/material';

import FormDialog, { FormSection } from '@/components/FormDialog';
import { useNotify } from '@/components/NotificationProvider';
import { optionalNumber, todayIso } from '@/lib/format';
import { useForm } from '@/lib/hooks/useForm';
import { useSaveMaintenanceRecord } from '@/lib/hooks/useMaintenance';
import { useMechanicOptions } from '@/lib/hooks/useMechanics';
import { MAINTENANCE_TYPE_LABELS, MaintenanceEntry, MaintenanceType, Mechanic } from '@/lib/types';

interface MaintenanceFormDialogProps {
  vehicleId: number;
  /** Shown in the title, so the user sees which vehicle the record is for. */
  vehicleName: string;
  /** The record to edit. Leave it out to create a new one. */
  record?: MaintenanceEntry;
  onClose: () => void;
}

export default function MaintenanceFormDialog({
  vehicleId,
  vehicleName,
  record,
  onClose,
}: MaintenanceFormDialogProps) {
  const notify = useNotify();
  const mechanics = useMechanicOptions();
  const saveRecord = useSaveMaintenanceRecord();
  const form = useForm({
    maintenance_date: record?.maintenance_date ?? todayIso(),
    maintenance_type: (record?.maintenance_type ?? '') as MaintenanceType | '',
    mechanic_id: record ? String(record.mechanic.id) : '',
    cost: record ? String(record.cost) : '',
    notes: record?.notes ?? '',
  });
  const { values } = form;

  // The dropdown lists active mechanics. The mechanic of an old record may be
  // inactive by now, and must still be there so the record can be edited.
  let mechanicOptions: Mechanic[] | undefined = mechanics.data;
  if (mechanicOptions && record && !mechanicOptions.some(({ id }) => id === record.mechanic.id)) {
    mechanicOptions = [record.mechanic, ...mechanicOptions];
  }

  const handleSubmit = () => {
    saveRecord.mutate(
      {
        id: record?.id,
        vehicle_id: vehicleId,
        mechanic_id: optionalNumber(values.mechanic_id),
        maintenance_date: values.maintenance_date || undefined,
        maintenance_type: values.maintenance_type || undefined,
        cost: values.cost || undefined,
        notes: values.notes,
      },
      {
        onSuccess: () => {
          notify(record ? 'The maintenance record was updated.' : 'The maintenance was recorded.');
          onClose();
        },
        onError: form.showApiError,
      },
    );
  };

  return (
    <FormDialog
      title={`${record ? 'Edit maintenance' : 'Record maintenance'}: ${vehicleName}`}
      submitLabel={record ? 'Save changes' : 'Save maintenance'}
      error={form.formError}
      saving={saveRecord.isPending}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <FormSection title="Service">
        <Box display="grid" gap={2} gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }}>
          <TextField
            label="Date"
            type="date"
            value={values.maintenance_date}
            onChange={(event) => form.setField('maintenance_date', event.target.value)}
            required
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: todayIso() } }}
            {...form.errorProps('maintenance_date')}
          />
          <TextField
            select
            label="Type"
            value={values.maintenance_type}
            onChange={(event) =>
              form.setField('maintenance_type', event.target.value as MaintenanceType)
            }
            required
            {...form.errorProps('maintenance_type')}
          >
            {Object.entries(MAINTENANCE_TYPE_LABELS).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
        </Box>
        <TextField
          select
          label="Mechanic"
          value={mechanicOptions ? values.mechanic_id : ''}
          onChange={(event) => form.setField('mechanic_id', event.target.value)}
          required
          fullWidth
          disabled={mechanics.isPending}
          {...form.errorProps(
            'mechanic_id',
            mechanicOptions?.length === 0 ? 'Create a mechanic first.' : undefined,
          )}
        >
          {(mechanicOptions ?? []).map((mechanic) => (
            <MenuItem key={mechanic.id} value={String(mechanic.id)}>
              {mechanic.name} · {mechanic.certification_number}
              {!mechanic.is_active && ' (inactive)'}
            </MenuItem>
          ))}
        </TextField>
      </FormSection>

      <FormSection title="Cost and notes">
        <TextField
          label="Cost"
          type="number"
          value={values.cost}
          onChange={(event) => form.setField('cost', event.target.value)}
          required
          fullWidth
          slotProps={{
            input: {
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
              endAdornment: <InputAdornment position="end">USD</InputAdornment>,
            },
            htmlInput: { min: 0, step: '0.01', inputMode: 'decimal' },
          }}
          {...form.errorProps('cost')}
        />
        <TextField
          label="Notes"
          value={values.notes}
          onChange={(event) => form.setField('notes', event.target.value)}
          multiline
          minRows={3}
          fullWidth
          placeholder="Parts replaced, problems found, next steps"
          {...form.errorProps('notes')}
        />
      </FormSection>
    </FormDialog>
  );
}

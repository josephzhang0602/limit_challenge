'use client';

import { FormControlLabel, Switch, TextField } from '@mui/material';

import FormDialog from '@/components/FormDialog';
import { useNotify } from '@/components/NotificationProvider';
import { useForm } from '@/lib/hooks/useForm';
import { useSaveMechanic } from '@/lib/hooks/useMechanics';
import { Mechanic } from '@/lib/types';

interface MechanicFormDialogProps {
  /** The mechanic to edit. Leave it out to create a new one. */
  mechanic?: Mechanic;
  onClose: () => void;
}

export default function MechanicFormDialog({ mechanic, onClose }: MechanicFormDialogProps) {
  const notify = useNotify();
  const saveMechanic = useSaveMechanic();
  const form = useForm({
    name: mechanic?.name ?? '',
    certification_number: mechanic?.certification_number ?? '',
    is_active: mechanic?.is_active ?? true,
  });

  const handleSubmit = () => {
    saveMechanic.mutate(
      { id: mechanic?.id, ...form.values },
      {
        onSuccess: (saved) => {
          notify(mechanic ? `${saved.name} was updated.` : `${saved.name} was created.`);
          onClose();
        },
        onError: form.showApiError,
      },
    );
  };

  return (
    <FormDialog
      title={mechanic ? 'Edit mechanic' : 'New mechanic'}
      submitLabel={mechanic ? 'Save changes' : 'Create mechanic'}
      error={form.formError}
      saving={saveMechanic.isPending}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <TextField
        label="Name"
        value={form.values.name}
        onChange={(event) => form.setField('name', event.target.value)}
        required
        autoFocus
        fullWidth
        {...form.errorProps('name')}
      />
      <TextField
        label="Certification number"
        value={form.values.certification_number}
        onChange={(event) => form.setField('certification_number', event.target.value)}
        required
        fullWidth
        {...form.errorProps('certification_number', 'Saved in upper case.')}
      />
      <FormControlLabel
        control={
          <Switch
            checked={form.values.is_active}
            onChange={(event) => form.setField('is_active', event.target.checked)}
          />
        }
        label={form.values.is_active ? 'Active' : 'Inactive: cannot receive new work'}
      />
    </FormDialog>
  );
}

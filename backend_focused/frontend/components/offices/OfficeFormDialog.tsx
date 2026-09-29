'use client';

import { TextField } from '@mui/material';

import FormDialog from '@/components/FormDialog';
import { useNotify } from '@/components/NotificationProvider';
import { useForm } from '@/lib/hooks/useForm';
import { useSaveOffice } from '@/lib/hooks/useOffices';
import { Office } from '@/lib/types';

interface OfficeFormDialogProps {
  /** The office to edit. Leave it out to create a new one. */
  office?: Office;
  onClose: () => void;
}

export default function OfficeFormDialog({ office, onClose }: OfficeFormDialogProps) {
  const notify = useNotify();
  const saveOffice = useSaveOffice();
  const form = useForm({ name: office?.name ?? '', city: office?.city ?? '' });

  const handleSubmit = () => {
    saveOffice.mutate(
      { id: office?.id, ...form.values },
      {
        onSuccess: (saved) => {
          notify(office ? `${saved.name} was updated.` : `${saved.name} was created.`);
          onClose();
        },
        onError: form.showApiError,
      },
    );
  };

  return (
    <FormDialog
      title={office ? 'Edit office' : 'New office'}
      submitLabel={office ? 'Save changes' : 'Create office'}
      error={form.formError}
      saving={saveOffice.isPending}
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
        label="City"
        value={form.values.city}
        onChange={(event) => form.setField('city', event.target.value)}
        required
        fullWidth
        {...form.errorProps('city')}
      />
    </FormDialog>
  );
}

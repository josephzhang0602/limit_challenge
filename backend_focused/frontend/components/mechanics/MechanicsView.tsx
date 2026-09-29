'use client';

import {
  Box,
  Button,
  Chip,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material';
import { useState } from 'react';

import ConfirmDialog from '@/components/ConfirmDialog';
import { useNotify } from '@/components/NotificationProvider';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/StateViews';
import { parseApiError } from '@/lib/errors';
import { formatCurrency } from '@/lib/format';
import { useDeleteMechanic, useMechanicWorkload } from '@/lib/hooks/useMechanics';
import { useResetInvalidPage } from '@/lib/hooks/useResetInvalidPage';
import { useUrlState } from '@/lib/hooks/useUrlState';
import { MechanicWorkload } from '@/lib/types';

import MechanicFormDialog from './MechanicFormDialog';

const COLUMN_COUNT = 6;
const PAGE_SIZES = [10, 25, 50];

export default function MechanicsView() {
  const notify = useNotify();
  const url = useUrlState();
  const page = Number(url.get('page')) || 1;
  const pageSize = Number(url.get('page_size')) || PAGE_SIZES[0];

  const workload = useMechanicWorkload(page, pageSize);
  const deleteMechanic = useDeleteMechanic();
  useResetInvalidPage(workload.error, page, () => url.update({ page: null }));

  const [form, setForm] = useState<{ mechanic?: MechanicWorkload } | null>(null);
  const [toDelete, setToDelete] = useState<MechanicWorkload | null>(null);

  const handleDelete = () => {
    if (!toDelete) {
      return;
    }
    deleteMechanic.mutate(toDelete.id, {
      onSuccess: () => notify(`${toDelete.name} was deleted.`),
      onError: (error) => notify(parseApiError(error).message, 'error'),
      onSettled: () => setToDelete(null),
    });
  };

  const mechanics = workload.data?.results ?? [];

  return (
    <Stack spacing={3}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2}>
        <div>
          <Typography variant="h4" component="h1">
            Mechanics
          </Typography>
          <Typography color="text.secondary">
            Work completed this year, from the busiest mechanic to the least busy.
          </Typography>
        </div>
        <Button variant="contained" onClick={() => setForm({})} sx={{ flexShrink: 0 }}>
          New mechanic
        </Button>
      </Box>

      {workload.isError ? (
        <ErrorState error={workload.error} onRetry={() => workload.refetch()} />
      ) : (
        <Paper variant="outlined">
          <LinearProgress sx={{ visibility: workload.isFetching ? 'visible' : 'hidden' }} />
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Certification</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Jobs this year</TableCell>
                  <TableCell align="right">Cost this year</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {workload.isPending && <TableSkeleton columns={COLUMN_COUNT} />}
                {mechanics.map((mechanic) => (
                  <TableRow key={mechanic.id} hover>
                    <TableCell>{mechanic.name}</TableCell>
                    <TableCell>{mechanic.certification_number}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={mechanic.is_active ? 'Active' : 'Inactive'}
                        color={mechanic.is_active ? 'success' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">{mechanic.maintenance_count}</TableCell>
                    <TableCell align="right">{formatCurrency(mechanic.total_cost)}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      <Button size="small" onClick={() => setForm({ mechanic })}>
                        Edit
                      </Button>
                      <Button size="small" color="error" onClick={() => setToDelete(mechanic)}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {workload.isSuccess && mechanics.length === 0 && (
            <EmptyState
              title="No mechanics yet"
              description="Create a mechanic to start recording maintenance."
              action={
                <Button variant="outlined" onClick={() => setForm({})}>
                  New mechanic
                </Button>
              }
            />
          )}
          <TablePagination
            component="div"
            count={workload.data?.count ?? 0}
            page={page - 1}
            rowsPerPage={pageSize}
            rowsPerPageOptions={PAGE_SIZES}
            onPageChange={(_, next) => url.update({ page: next === 0 ? null : next + 1 })}
            onRowsPerPageChange={(event) => url.update({ page_size: event.target.value })}
          />
        </Paper>
      )}

      {form && <MechanicFormDialog mechanic={form.mechanic} onClose={() => setForm(null)} />}

      {toDelete && (
        <ConfirmDialog
          title="Delete mechanic?"
          message={`${toDelete.name} will be deleted. A mechanic with maintenance records cannot be deleted, but can be set to inactive.`}
          loading={deleteMechanic.isPending}
          onConfirm={handleDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </Stack>
  );
}

'use client';

import {
  Box,
  Button,
  LinearProgress,
  Link as MuiLink,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import Link from 'next/link';
import { useState } from 'react';

import ConfirmDialog from '@/components/ConfirmDialog';
import { useNotify } from '@/components/NotificationProvider';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/StateViews';
import { parseApiError } from '@/lib/errors';
import { useSession } from '@/lib/hooks/useSession';
import { formatCurrency, formatDate } from '@/lib/format';
import { useDeleteOffice, useOfficeSummary } from '@/lib/hooks/useOffices';
import { OfficeSummary } from '@/lib/types';

import OfficeFormDialog from './OfficeFormDialog';

const COLUMN_COUNT = 6;

export default function OfficesView() {
  const notify = useNotify();
  const { canEdit } = useSession();
  const summary = useOfficeSummary();
  const deleteOffice = useDeleteOffice();

  // `null`: closed. `{}`: creating. `{ office }`: editing that office.
  const [form, setForm] = useState<{ office?: OfficeSummary } | null>(null);
  const [toDelete, setToDelete] = useState<OfficeSummary | null>(null);

  const handleDelete = () => {
    if (!toDelete) {
      return;
    }
    deleteOffice.mutate(toDelete.id, {
      onSuccess: () => notify(`${toDelete.name} was deleted.`),
      onError: (error) => notify(parseApiError(error).message, 'error'),
      onSettled: () => setToDelete(null),
    });
  };

  const offices = summary.data ?? [];

  return (
    <Stack spacing={3}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2}>
        <div>
          <Typography variant="h4" component="h1">
            Offices
          </Typography>
          <Typography color="text.secondary">
            Active vehicles and maintenance cost of each office in the last 12 months.
          </Typography>
        </div>
        {canEdit && (
          <Button variant="contained" onClick={() => setForm({})} sx={{ flexShrink: 0 }}>
            New office
          </Button>
        )}
      </Box>

      {summary.isError ? (
        <ErrorState error={summary.error} onRetry={() => summary.refetch()} />
      ) : (
        <Paper variant="outlined">
          {/* Refreshing in the background: keep the rows and show a thin bar. */}
          <LinearProgress sx={{ visibility: summary.isFetching ? 'visible' : 'hidden' }} />
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Office</TableCell>
                  <TableCell>City</TableCell>
                  <TableCell align="right">Active vehicles</TableCell>
                  <TableCell align="right">Cost, last 12 months</TableCell>
                  <TableCell>Last maintenance</TableCell>
                  {canEdit && <TableCell align="right">Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {summary.isPending && (
                  <TableSkeleton columns={canEdit ? COLUMN_COUNT : COLUMN_COUNT - 1} />
                )}
                {offices.map((office) => (
                  <TableRow key={office.id} hover>
                    <TableCell>
                      <MuiLink component={Link} href={`/vehicles?office=${office.id}`}>
                        {office.name}
                      </MuiLink>
                    </TableCell>
                    <TableCell>{office.city}</TableCell>
                    <TableCell align="right">{office.active_vehicle_count}</TableCell>
                    <TableCell align="right">
                      {formatCurrency(office.maintenance_cost_last_year)}
                    </TableCell>
                    <TableCell>{formatDate(office.last_maintenance)}</TableCell>
                    {canEdit && (
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <Button size="small" onClick={() => setForm({ office })}>
                          Edit
                        </Button>
                        <Button size="small" color="error" onClick={() => setToDelete(office)}>
                          Delete
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {summary.isSuccess && offices.length === 0 && (
            <EmptyState
              title="No offices yet"
              description="Create the first office to start assigning vehicles to it."
              action={
                canEdit && (
                  <Button variant="outlined" onClick={() => setForm({})}>
                    New office
                  </Button>
                )
              }
            />
          )}
        </Paper>
      )}

      {form && <OfficeFormDialog office={form.office} onClose={() => setForm(null)} />}

      {toDelete && (
        <ConfirmDialog
          title="Delete office?"
          message={`${toDelete.name} will be deleted. An office that still has vehicles cannot be deleted.`}
          loading={deleteOffice.isPending}
          onConfirm={handleDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </Stack>
  );
}

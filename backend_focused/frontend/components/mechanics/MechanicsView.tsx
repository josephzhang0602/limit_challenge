'use client';

import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import EngineeringOutlinedIcon from '@mui/icons-material/EngineeringOutlined';
import {
  Avatar,
  Box,
  Button,
  Card,
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
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { visuallyHidden } from '@mui/utils';
import { useState } from 'react';

import ConfirmDialog from '@/components/ConfirmDialog';
import { initials } from '@/components/layout/Sidebar';
import { useNotify } from '@/components/NotificationProvider';
import PageHeader from '@/components/PageHeader';
import RowActions, { RowAction } from '@/components/RowActions';
import { CardListSkeleton, EmptyState, ErrorState, TableSkeleton } from '@/components/StateViews';
import { ActiveChip } from '@/components/StatusChips';
import { parseApiError } from '@/lib/errors';
import { formatCurrency } from '@/lib/format';
import { useDeleteMechanic, useMechanicWorkload } from '@/lib/hooks/useMechanics';
import { useResetInvalidPage } from '@/lib/hooks/useResetInvalidPage';
import { useSession } from '@/lib/hooks/useSession';
import { useUrlState } from '@/lib/hooks/useUrlState';
import { MechanicWorkload } from '@/lib/types';

import MechanicFormDialog from './MechanicFormDialog';

const COLUMN_COUNT = 5;
const PAGE_SIZES = [10, 25, 50];

function Person({ mechanic }: { mechanic: MechanicWorkload }) {
  return (
    <Box display="flex" alignItems="center" gap={1.5} minWidth={0}>
      <Avatar
        sx={{
          width: 36,
          height: 36,
          fontSize: 14,
          bgcolor: mechanic.is_active ? 'primary.main' : 'action.disabledBackground',
          color: mechanic.is_active ? 'primary.contrastText' : 'text.primary',
        }}
      >
        {initials(mechanic.name)}
      </Avatar>
      <Box minWidth={0}>
        <Typography fontWeight={600} noWrap>
          {mechanic.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {mechanic.certification_number}
        </Typography>
      </Box>
    </Box>
  );
}

function WorkloadBar({ jobs, max }: { jobs: number; max: number }) {
  return (
    <Box display="flex" alignItems="center" gap={1.5}>
      <LinearProgress
        variant="determinate"
        value={(jobs / max) * 100}
        aria-hidden
        sx={{ flexGrow: 1, height: 6, borderRadius: 3, minWidth: 60 }}
      />
      <Typography variant="body2" fontWeight={600} minWidth={24} textAlign="right">
        {jobs}
      </Typography>
    </Box>
  );
}

export default function MechanicsView() {
  const notify = useNotify();
  const { canEdit } = useSession();
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down('md'), { noSsr: true });
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
  // The list is ordered by workload, so the busiest of this page sets the scale.
  const maxJobs = Math.max(1, ...mechanics.map((mechanic) => mechanic.maintenance_count));

  const actionsFor = (mechanic: MechanicWorkload): RowAction[] => [
    {
      label: 'Edit',
      icon: <EditOutlinedIcon fontSize="small" />,
      onClick: () => setForm({ mechanic }),
    },
    {
      label: 'Delete',
      icon: <DeleteOutlineIcon fontSize="small" />,
      danger: true,
      onClick: () => setToDelete(mechanic),
    },
  ];

  const newMechanicButton = canEdit && (
    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setForm({})}>
      New mechanic
    </Button>
  );

  const table = (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Mechanic</TableCell>
            <TableCell>Status</TableCell>
            <TableCell sx={{ width: '30%' }}>Jobs this year</TableCell>
            <TableCell align="right">Cost this year</TableCell>
            {canEdit && (
              <TableCell align="right">
                <Box component="span" sx={visuallyHidden}>
                  Actions
                </Box>
              </TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {workload.isPending && (
            <TableSkeleton columns={canEdit ? COLUMN_COUNT : COLUMN_COUNT - 1} />
          )}
          {mechanics.map((mechanic) => (
            <TableRow key={mechanic.id} hover>
              <TableCell>
                <Person mechanic={mechanic} />
              </TableCell>
              <TableCell>
                <ActiveChip active={mechanic.is_active} />
              </TableCell>
              <TableCell>
                <WorkloadBar jobs={mechanic.maintenance_count} max={maxJobs} />
              </TableCell>
              <TableCell align="right">{formatCurrency(mechanic.total_cost)}</TableCell>
              {canEdit && (
                <TableCell align="right">
                  <RowActions subject={mechanic.name} actions={actionsFor(mechanic)} />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const cards = workload.isPending ? (
    <CardListSkeleton />
  ) : (
    <Stack spacing={1.5} px={2} pb={1}>
      {mechanics.map((mechanic) => (
        <Card key={mechanic.id} sx={{ p: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1}>
            <Person mechanic={mechanic} />
            {canEdit && <RowActions subject={mechanic.name} actions={actionsFor(mechanic)} />}
          </Box>
          <Box mt={1.5}>
            <Typography variant="caption" color="text.secondary">
              Jobs this year · {formatCurrency(mechanic.total_cost)}
            </Typography>
            <WorkloadBar jobs={mechanic.maintenance_count} max={maxJobs} />
          </Box>
          {!mechanic.is_active && (
            <Box mt={1}>
              <ActiveChip active={false} />
            </Box>
          )}
        </Card>
      ))}
    </Stack>
  );

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Mechanics"
        description="Work completed this year, from the busiest mechanic to the least busy."
        actions={newMechanicButton}
      />

      {workload.isError ? (
        <ErrorState error={workload.error} onRetry={() => workload.refetch()} />
      ) : (
        <Paper variant="outlined">
          <LinearProgress sx={{ visibility: workload.isFetching ? 'visible' : 'hidden' }} />
          {isPhone ? cards : table}
          {workload.isSuccess && mechanics.length === 0 && (
            <EmptyState
              icon={<EngineeringOutlinedIcon />}
              title="No mechanics yet"
              description="Create a mechanic to start recording maintenance."
              action={newMechanicButton}
            />
          )}
          <TablePagination
            component="div"
            count={workload.data?.count ?? 0}
            page={page - 1}
            rowsPerPage={pageSize}
            rowsPerPageOptions={isPhone ? [] : PAGE_SIZES}
            onPageChange={(_, next) => url.update({ page: next === 0 ? null : next + 1 })}
            onRowsPerPageChange={(event) => url.update({ page_size: event.target.value })}
          />
        </Paper>
      )}

      {form && <MechanicFormDialog mechanic={form.mechanic} onClose={() => setForm(null)} />}

      {toDelete && (
        <ConfirmDialog
          title="Delete mechanic?"
          message={
            <>
              <strong>{toDelete.name}</strong> will be deleted. A mechanic with maintenance records
              cannot be deleted, but can be set to inactive.
            </>
          }
          loading={deleteMechanic.isPending}
          onConfirm={handleDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </Stack>
  );
}

'use client';

import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Link as MuiLink,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ReactNode, useState } from 'react';

import ConfirmDialog from '@/components/ConfirmDialog';
import { useNotify } from '@/components/NotificationProvider';
import { EmptyState, ErrorState } from '@/components/StateViews';
import { parseApiError } from '@/lib/errors';
import { formatCurrency, formatDate } from '@/lib/format';
import { useDeleteMaintenanceRecord } from '@/lib/hooks/useMaintenance';
import { useDeleteVehicle, useVehicleDetail } from '@/lib/hooks/useVehicles';
import { MAINTENANCE_TYPE_LABELS, MaintenanceEntry } from '@/lib/types';

import AssignOfficeDialog from './AssignOfficeDialog';
import MaintenanceFormDialog from './MaintenanceFormDialog';
import VehicleFormDialog from './VehicleFormDialog';

const HISTORY_PAGE_SIZE = 10;

type OpenDialog =
  | { kind: 'edit' }
  | { kind: 'assign' }
  | { kind: 'delete' }
  | { kind: 'record'; record?: MaintenanceEntry }
  | { kind: 'delete-record'; record: MaintenanceEntry };

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography component="div" fontWeight={500}>
        {children}
      </Typography>
    </div>
  );
}

export default function VehicleDetailView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const notify = useNotify();

  // The list sends its own query string, so "Back" returns to the same search.
  const from = useSearchParams().get('from');
  const listHref = from ? `/vehicles?${from}` : '/vehicles';

  const detail = useVehicleDetail(id);
  const deleteVehicle = useDeleteVehicle();
  const deleteRecord = useDeleteMaintenanceRecord();

  const [dialog, setDialog] = useState<OpenDialog | null>(null);
  const [historyPage, setHistoryPage] = useState(0);
  const closeDialog = () => setDialog(null);

  const backLink = (
    <MuiLink component={Link} href={listHref} underline="hover">
      &larr; Back to vehicles
    </MuiLink>
  );

  if (detail.isPending) {
    return (
      <Stack spacing={3}>
        {backLink}
        <Skeleton variant="text" width="50%" height={56} />
        <Skeleton variant="rounded" height={120} />
        <Skeleton variant="rounded" height={320} />
      </Stack>
    );
  }

  if (detail.isError) {
    const notFound = parseApiError(detail.error).status === 404;
    return (
      <Stack spacing={3}>
        {backLink}
        {notFound ? (
          <EmptyState
            title="Vehicle not found"
            description="It may have been deleted, or the link may be wrong."
          />
        ) : (
          <ErrorState error={detail.error} onRetry={() => detail.refetch()} />
        )}
      </Stack>
    );
  }

  const vehicle = detail.data;
  const history = vehicle.maintenance_history;
  const hasHistory = history.length > 0;
  const totalCost = history.reduce((sum, record) => sum + record.cost, 0);

  // After deleting records the current page may not exist any more.
  const lastPage = Math.max(0, Math.ceil(history.length / HISTORY_PAGE_SIZE) - 1);
  const page = Math.min(historyPage, lastPage);
  const visibleHistory = history.slice(page * HISTORY_PAGE_SIZE, (page + 1) * HISTORY_PAGE_SIZE);

  const handleDeleteVehicle = () => {
    deleteVehicle.mutate(vehicle.id, {
      onSuccess: () => {
        notify(`${vehicle.make} ${vehicle.model} was deleted.`);
        router.push(listHref);
      },
      onError: (error) => {
        notify(parseApiError(error).message, 'error');
        closeDialog();
      },
    });
  };

  const handleDeleteRecord = (record: MaintenanceEntry) => {
    deleteRecord.mutate(record.id, {
      onSuccess: () => notify('The maintenance record was deleted.'),
      onError: (error) => notify(parseApiError(error).message, 'error'),
      onSettled: closeDialog,
    });
  };

  return (
    <Stack spacing={3}>
      {backLink}

      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="flex-start"
        gap={2}
        flexWrap="wrap"
      >
        <div>
          <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
            <Typography variant="h4" component="h1">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </Typography>
            <Chip
              label={vehicle.is_active ? 'Active' : 'Inactive'}
              color={vehicle.is_active ? 'success' : 'default'}
              variant="outlined"
            />
          </Box>
          <Typography color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            {vehicle.vin}
          </Typography>
        </div>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => setDialog({ kind: 'edit' })}>
            Edit
          </Button>
          <Button variant="outlined" onClick={() => setDialog({ kind: 'assign' })}>
            Move to office
          </Button>
          <Tooltip
            title={
              hasHistory
                ? 'A vehicle with maintenance records cannot be deleted. Set it to inactive instead.'
                : ''
            }
          >
            {/* A disabled button has no mouse events, so the tooltip needs the span. */}
            <span>
              <Button
                variant="outlined"
                color="error"
                disabled={hasHistory}
                onClick={() => setDialog({ kind: 'delete' })}
              >
                Delete
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Box>

      <Card variant="outlined">
        <CardContent>
          <Box display="grid" gap={3} gridTemplateColumns={{ xs: '1fr 1fr', md: 'repeat(5, 1fr)' }}>
            <Fact label="License plate">{vehicle.license_plate}</Fact>
            <Fact label="Office">
              {vehicle.office.name}
              <Typography variant="body2" color="text.secondary">
                {vehicle.office.city}
              </Typography>
            </Fact>
            <Fact label="Last maintenance">{formatDate(vehicle.last_maintenance)}</Fact>
            <Fact label="Maintenance records">{history.length}</Fact>
            <Fact label="Total maintenance cost">{formatCurrency(totalCost)}</Fact>
          </Box>
        </CardContent>
      </Card>

      <Paper variant="outlined">
        <LinearProgress sx={{ visibility: detail.isFetching ? 'visible' : 'hidden' }} />
        <Box display="flex" justifyContent="space-between" alignItems="center" px={2} py={1.5}>
          <Typography variant="h6" component="h2">
            Maintenance history
          </Typography>
          <Button variant="contained" size="small" onClick={() => setDialog({ kind: 'record' })}>
            Record maintenance
          </Button>
        </Box>

        {!hasHistory ? (
          <EmptyState
            title="No maintenance yet"
            description="This vehicle has never been serviced."
          />
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Mechanic</TableCell>
                    <TableCell align="right">Cost</TableCell>
                    <TableCell>Notes</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleHistory.map((record) => (
                    <TableRow key={record.id} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {formatDate(record.maintenance_date)}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {MAINTENANCE_TYPE_LABELS[record.maintenance_type]}
                      </TableCell>
                      <TableCell>
                        {record.mechanic.name}
                        <Typography variant="body2" color="text.secondary">
                          {record.mechanic.certification_number}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{formatCurrency(record.cost)}</TableCell>
                      <TableCell sx={{ maxWidth: 280 }}>{record.notes}</TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <Button size="small" onClick={() => setDialog({ kind: 'record', record })}>
                          Edit
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          onClick={() => setDialog({ kind: 'delete-record', record })}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={history.length}
              page={page}
              rowsPerPage={HISTORY_PAGE_SIZE}
              rowsPerPageOptions={[HISTORY_PAGE_SIZE]}
              onPageChange={(_, next) => setHistoryPage(next)}
            />
          </>
        )}
      </Paper>

      {dialog?.kind === 'edit' && <VehicleFormDialog vehicle={vehicle} onClose={closeDialog} />}

      {dialog?.kind === 'assign' && <AssignOfficeDialog vehicle={vehicle} onClose={closeDialog} />}

      {dialog?.kind === 'record' && (
        <MaintenanceFormDialog
          vehicleId={vehicle.id}
          record={dialog.record}
          onClose={closeDialog}
        />
      )}

      {dialog?.kind === 'delete' && (
        <ConfirmDialog
          title="Delete vehicle?"
          message={`${vehicle.make} ${vehicle.model} (${vehicle.vin}) will be deleted.`}
          loading={deleteVehicle.isPending}
          onConfirm={handleDeleteVehicle}
          onCancel={closeDialog}
        />
      )}

      {dialog?.kind === 'delete-record' && (
        <ConfirmDialog
          title="Delete maintenance record?"
          message={`The ${MAINTENANCE_TYPE_LABELS[
            dialog.record.maintenance_type
          ].toLowerCase()} of ${formatDate(dialog.record.maintenance_date)} will be deleted.`}
          loading={deleteRecord.isPending}
          onConfirm={() => handleDeleteRecord(dialog.record)}
          onCancel={closeDialog}
        />
      )}
    </Stack>
  );
}

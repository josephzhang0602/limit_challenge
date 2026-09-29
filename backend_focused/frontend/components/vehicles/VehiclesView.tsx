'use client';

import {
  Box,
  Button,
  Chip,
  LinearProgress,
  Link as MuiLink,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Typography,
} from '@mui/material';
import Link from 'next/link';
import { useCallback, useState } from 'react';

import ConfirmDialog from '@/components/ConfirmDialog';
import { useNotify } from '@/components/NotificationProvider';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/StateViews';
import { parseApiError } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import { useResetInvalidPage } from '@/lib/hooks/useResetInvalidPage';
import { useUrlState } from '@/lib/hooks/useUrlState';
import { useDeleteVehicle, useVehicleList } from '@/lib/hooks/useVehicles';
import { Vehicle, VehicleListParams } from '@/lib/types';

import VehicleFilters, { FILTER_KEYS } from './VehicleFilters';
import VehicleFormDialog from './VehicleFormDialog';

const PAGE_SIZES = [10, 25, 50];

/** `ordering` is the name of the field in the API. Columns without it cannot be sorted. */
const COLUMNS: { label: string; ordering?: string }[] = [
  { label: 'VIN', ordering: 'vin' },
  { label: 'Plate' },
  { label: 'Make', ordering: 'make' },
  { label: 'Model', ordering: 'model' },
  { label: 'Year', ordering: 'year' },
  { label: 'Office' },
  { label: 'Status' },
  { label: 'Last maintenance', ordering: 'last_maintenance' },
];

export default function VehiclesView() {
  const notify = useNotify();
  const url = useUrlState();

  // Everything that decides what the list shows is read from the URL.
  const params: VehicleListParams = {
    office: url.get('office'),
    is_active: url.get('is_active'),
    make: url.get('make'),
    model: url.get('model'),
    maintained_from: url.get('maintained_from'),
    maintained_to: url.get('maintained_to'),
    mechanic_certification: url.get('mechanic_certification'),
    ordering: url.get('ordering'),
    overdue: url.get('overdue') === '1',
    page: Number(url.get('page')) || 1,
    page_size: Number(url.get('page_size')) || PAGE_SIZES[0],
  };
  const activeFilterCount = FILTER_KEYS.filter((key) => url.get(key) !== '').length;

  const vehicles = useVehicleList(params);
  const deleteVehicle = useDeleteVehicle();
  useResetInvalidPage(vehicles.error, params.page, () => url.update({ page: null }));

  const [form, setForm] = useState<{ vehicle?: Vehicle } | null>(null);
  const [toDelete, setToDelete] = useState<Vehicle | null>(null);

  const { update } = url;
  const clearFilters = useCallback(
    () => update(Object.fromEntries(FILTER_KEYS.map((key) => [key, null]))),
    [update],
  );

  const handleSort = (field: string) => {
    // Click once: ascending. Twice: descending. Three times: back to the default.
    const next =
      params.ordering === field ? `-${field}` : params.ordering === `-${field}` ? null : field;
    url.update({ ordering: next });
  };

  const handleDelete = () => {
    if (!toDelete) {
      return;
    }
    deleteVehicle.mutate(toDelete.id, {
      onSuccess: () => notify(`${toDelete.make} ${toDelete.model} was deleted.`),
      onError: (error) => notify(parseApiError(error).message, 'error'),
      onSettled: () => setToDelete(null),
    });
  };

  const rows = vehicles.data?.results ?? [];
  const total = vehicles.data?.count ?? 0;
  // The detail page uses this to come back to the same filters and page.
  const detailSuffix = url.query ? `?from=${encodeURIComponent(url.query)}` : '';

  return (
    <Stack spacing={3}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2}>
        <div>
          <Typography variant="h4" component="h1">
            Vehicles
          </Typography>
          <Typography color="text.secondary">
            Search the fleet, and open a vehicle to see its maintenance history.
          </Typography>
        </div>
        <Button variant="contained" onClick={() => setForm({})} sx={{ flexShrink: 0 }}>
          New vehicle
        </Button>
      </Box>

      <VehicleFilters
        filters={params}
        activeCount={activeFilterCount}
        onChange={update}
        onClear={clearFilters}
      />

      {vehicles.isError ? (
        <ErrorState error={vehicles.error} onRetry={() => vehicles.refetch()} />
      ) : (
        <Paper variant="outlined">
          <LinearProgress sx={{ visibility: vehicles.isFetching ? 'visible' : 'hidden' }} />
          <Box px={2} py={1.5}>
            <Typography variant="body2" color="text.secondary" aria-live="polite">
              {vehicles.isPending
                ? 'Loading vehicles...'
                : `${total} ${total === 1 ? 'vehicle' : 'vehicles'} found`}
            </Typography>
          </Box>
          <TableContainer>
            {/* The rows of the previous search are dimmed while the new ones load. */}
            <Table sx={{ opacity: vehicles.isPlaceholderData ? 0.5 : 1 }}>
              <TableHead>
                <TableRow>
                  {COLUMNS.map(({ label, ordering }) => (
                    <TableCell key={label} sx={{ whiteSpace: 'nowrap' }}>
                      {ordering && !params.overdue ? (
                        <TableSortLabel
                          active={params.ordering.replace('-', '') === ordering}
                          direction={params.ordering === `-${ordering}` ? 'desc' : 'asc'}
                          onClick={() => handleSort(ordering)}
                        >
                          {label}
                        </TableSortLabel>
                      ) : (
                        label
                      )}
                    </TableCell>
                  ))}
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {vehicles.isPending && <TableSkeleton columns={COLUMNS.length + 1} />}
                {rows.map((vehicle) => (
                  <TableRow key={vehicle.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace' }}>
                      <MuiLink component={Link} href={`/vehicles/${vehicle.id}${detailSuffix}`}>
                        {vehicle.vin}
                      </MuiLink>
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{vehicle.license_plate}</TableCell>
                    <TableCell>{vehicle.make}</TableCell>
                    <TableCell>{vehicle.model}</TableCell>
                    <TableCell>{vehicle.year}</TableCell>
                    <TableCell>{vehicle.office.name}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={vehicle.is_active ? 'Active' : 'Inactive'}
                        color={vehicle.is_active ? 'success' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {formatDate(vehicle.last_maintenance)}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      <Button size="small" onClick={() => setForm({ vehicle })}>
                        Edit
                      </Button>
                      <Button size="small" color="error" onClick={() => setToDelete(vehicle)}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {vehicles.isSuccess &&
            rows.length === 0 &&
            (activeFilterCount > 0 ? (
              <EmptyState
                title="No vehicles match these filters"
                description="Try removing a filter or widening the dates."
                action={
                  <Button variant="outlined" onClick={clearFilters}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <EmptyState
                title="No vehicles yet"
                description="Create the first vehicle of the fleet."
                action={
                  <Button variant="outlined" onClick={() => setForm({})}>
                    New vehicle
                  </Button>
                }
              />
            ))}

          <TablePagination
            component="div"
            count={total}
            page={total === 0 ? 0 : params.page - 1}
            rowsPerPage={params.page_size}
            rowsPerPageOptions={PAGE_SIZES}
            onPageChange={(_, next) => url.update({ page: next === 0 ? null : next + 1 })}
            onRowsPerPageChange={(event) => url.update({ page_size: event.target.value })}
          />
        </Paper>
      )}

      {form && <VehicleFormDialog vehicle={form.vehicle} onClose={() => setForm(null)} />}

      {toDelete && (
        <ConfirmDialog
          title="Delete vehicle?"
          message={`${toDelete.make} ${toDelete.model} (${toDelete.vin}) will be deleted. A vehicle with maintenance records cannot be deleted, but can be set to inactive.`}
          loading={deleteVehicle.isPending}
          onConfirm={handleDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </Stack>
  );
}

'use client';

import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import {
  Box,
  Button,
  Card,
  CardActionArea,
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
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { visuallyHidden } from '@mui/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import ConfirmDialog from '@/components/ConfirmDialog';
import { useNotify } from '@/components/NotificationProvider';
import PageHeader from '@/components/PageHeader';
import RowActions, { RowAction } from '@/components/RowActions';
import { CardListSkeleton, EmptyState, ErrorState, TableSkeleton } from '@/components/StateViews';
import { ActiveChip, OverdueChip } from '@/components/StatusChips';
import { parseApiError } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import { useResetInvalidPage } from '@/lib/hooks/useResetInvalidPage';
import { useSession } from '@/lib/hooks/useSession';
import { useUrlState } from '@/lib/hooks/useUrlState';
import { useDeleteVehicle, useVehicleList } from '@/lib/hooks/useVehicles';
import { Vehicle, VehicleListParams } from '@/lib/types';
import { vehicleName } from '@/lib/vehicles';

import AssignOfficeDialog from './AssignOfficeDialog';
import VehicleFilters, { FILTER_KEYS } from './VehicleFilters';
import VehicleFormDialog from './VehicleFormDialog';

const PAGE_SIZES = [10, 25, 50];

/** `ordering` is the name of the field in the API. Columns without it cannot be sorted. */
const COLUMNS: { label: string; ordering?: string }[] = [
  { label: 'Vehicle', ordering: 'make' },
  { label: 'Plate' },
  { label: 'Year', ordering: 'year' },
  { label: 'Office' },
  { label: 'Status' },
  { label: 'Last maintenance', ordering: 'last_maintenance' },
];

type OpenDialog =
  | { kind: 'form'; vehicle?: Vehicle }
  | { kind: 'assign'; vehicle: Vehicle }
  | { kind: 'delete'; vehicle: Vehicle };

export default function VehiclesView() {
  const notify = useNotify();
  const router = useRouter();
  const { canEdit } = useSession();
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down('md'), { noSsr: true });
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

  const [dialog, setDialog] = useState<OpenDialog | null>(null);
  const closeDialog = () => setDialog(null);

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

  const handleDelete = (vehicle: Vehicle) => {
    deleteVehicle.mutate(vehicle.id, {
      onSuccess: () => notify(`${vehicleName(vehicle)} was deleted.`),
      onError: (error) => notify(parseApiError(error).message, 'error'),
      onSettled: closeDialog,
    });
  };

  const rows = vehicles.data?.results ?? [];
  const total = vehicles.data?.count ?? 0;
  // The detail page uses this to come back to the same filters and page.
  const detailSuffix = url.query ? `?from=${encodeURIComponent(url.query)}` : '';
  const detailHref = (vehicle: Vehicle) => `/vehicles/${vehicle.id}${detailSuffix}`;

  const actionsFor = (vehicle: Vehicle): RowAction[] => [
    {
      label: 'Edit',
      icon: <EditOutlinedIcon fontSize="small" />,
      onClick: () => setDialog({ kind: 'form', vehicle }),
    },
    {
      label: 'Move to office',
      icon: <SwapHorizIcon fontSize="small" />,
      onClick: () => setDialog({ kind: 'assign', vehicle }),
    },
    {
      label: 'Delete',
      icon: <DeleteOutlineIcon fontSize="small" />,
      danger: true,
      onClick: () => setDialog({ kind: 'delete', vehicle }),
      // A vehicle that was ever serviced has records, and the API keeps them.
      disabledReason: vehicle.last_maintenance
        ? 'It has maintenance records. Set it to inactive instead.'
        : undefined,
    },
  ];

  const newVehicleButton = canEdit && (
    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ kind: 'form' })}>
      New vehicle
    </Button>
  );

  const emptyState =
    activeFilterCount > 0 ? (
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
        icon={<LocalShippingOutlinedIcon />}
        title="No vehicles yet"
        description="Create the first vehicle of the fleet."
        action={newVehicleButton}
      />
    );

  const table = (
    <TableContainer>
      {/* The rows of the previous search are dimmed while the new ones load. */}
      <Table sx={{ opacity: vehicles.isPlaceholderData ? 0.5 : 1 }}>
        <TableHead>
          <TableRow>
            {COLUMNS.map(({ label, ordering }) => (
              <TableCell key={label}>
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
          {vehicles.isPending && <TableSkeleton columns={COLUMNS.length + (canEdit ? 1 : 0)} />}
          {rows.map((vehicle) => (
            <TableRow
              key={vehicle.id}
              hover
              // The whole row opens the vehicle. The link in the first cell does
              // the same for keyboards and screen readers.
              onClick={() => router.push(detailHref(vehicle))}
              sx={{ cursor: 'pointer' }}
            >
              <TableCell>
                <MuiLink
                  component={Link}
                  href={detailHref(vehicle)}
                  underline="hover"
                  color="text.primary"
                  fontWeight={600}
                  onClick={(event) => event.stopPropagation()}
                >
                  {vehicle.make} {vehicle.model}
                </MuiLink>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  fontFamily="var(--font-geist-mono)"
                >
                  {vehicle.vin}
                </Typography>
              </TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{vehicle.license_plate}</TableCell>
              <TableCell>{vehicle.year}</TableCell>
              <TableCell>{vehicle.office.name}</TableCell>
              <TableCell>
                <Stack direction="row" spacing={0.75}>
                  <ActiveChip active={vehicle.is_active} />
                  <OverdueChip vehicle={vehicle} />
                </Stack>
              </TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>
                {formatDate(vehicle.last_maintenance)}
              </TableCell>
              {canEdit && (
                <TableCell align="right" onClick={(event) => event.stopPropagation()}>
                  <RowActions subject={vehicleName(vehicle)} actions={actionsFor(vehicle)} />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const cards = vehicles.isPending ? (
    <CardListSkeleton />
  ) : (
    <Stack spacing={1.5} px={2} pb={1} sx={{ opacity: vehicles.isPlaceholderData ? 0.5 : 1 }}>
      {rows.map((vehicle) => (
        <Card key={vehicle.id} sx={{ position: 'relative' }}>
          <CardActionArea component={Link} href={detailHref(vehicle)} sx={{ p: 2, pr: 6 }}>
            <Typography fontWeight={600}>{vehicleName(vehicle)}</Typography>
            <Typography variant="body2" color="text.secondary">
              {vehicle.license_plate} · {vehicle.office.name}
            </Typography>
            <Stack direction="row" spacing={0.75} mt={1} alignItems="center" flexWrap="wrap">
              <ActiveChip active={vehicle.is_active} />
              <OverdueChip vehicle={vehicle} />
              <Typography variant="caption" color="text.secondary">
                Last service: {formatDate(vehicle.last_maintenance)}
              </Typography>
            </Stack>
          </CardActionArea>
          {canEdit && (
            <Box position="absolute" top={8} right={8}>
              <RowActions subject={vehicleName(vehicle)} actions={actionsFor(vehicle)} />
            </Box>
          )}
        </Card>
      ))}
    </Stack>
  );

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Vehicles"
        description="Search the fleet, and open a vehicle to see its maintenance history."
        actions={newVehicleButton}
      />

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

          {isPhone ? cards : table}
          {vehicles.isSuccess && rows.length === 0 && emptyState}

          <TablePagination
            component="div"
            count={total}
            page={total === 0 ? 0 : params.page - 1}
            rowsPerPage={params.page_size}
            rowsPerPageOptions={isPhone ? [] : PAGE_SIZES}
            onPageChange={(_, next) => url.update({ page: next === 0 ? null : next + 1 })}
            onRowsPerPageChange={(event) => url.update({ page_size: event.target.value })}
          />
        </Paper>
      )}

      {dialog?.kind === 'form' && (
        <VehicleFormDialog vehicle={dialog.vehicle} onClose={closeDialog} />
      )}

      {dialog?.kind === 'assign' && (
        <AssignOfficeDialog vehicle={dialog.vehicle} onClose={closeDialog} />
      )}

      {dialog?.kind === 'delete' && (
        <ConfirmDialog
          title="Delete vehicle?"
          message={
            <>
              <strong>{vehicleName(dialog.vehicle)}</strong> ({dialog.vehicle.vin}) will be deleted.
              This cannot be undone.
            </>
          }
          loading={deleteVehicle.isPending}
          onConfirm={() => handleDelete(dialog.vehicle)}
          onCancel={closeDialog}
        />
      )}
    </Stack>
  );
}

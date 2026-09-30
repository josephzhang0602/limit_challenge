'use client';

import AddIcon from '@mui/icons-material/Add';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import {
  Alert,
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
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { visuallyHidden } from '@mui/utils';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ReactNode, useState } from 'react';

import ConfirmDialog from '@/components/ConfirmDialog';
import { useNotify } from '@/components/NotificationProvider';
import PageHeader from '@/components/PageHeader';
import RowActions, { RowAction } from '@/components/RowActions';
import { EmptyState, ErrorState } from '@/components/StateViews';
import { ActiveChip, OverdueChip } from '@/components/StatusChips';
import { parseApiError } from '@/lib/errors';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';
import { useDeleteMaintenanceRecord } from '@/lib/hooks/useMaintenance';
import { useSession } from '@/lib/hooks/useSession';
import { useDeleteVehicle, useVehicleDetail } from '@/lib/hooks/useVehicles';
import {
  MAINTENANCE_TYPE_LABELS,
  MaintenanceEntry,
  MaintenanceType,
  VehicleDetail,
} from '@/lib/types';
import { daysSince, isOverdue, vehicleName } from '@/lib/vehicles';

import AssignOfficeDialog from './AssignOfficeDialog';
import MaintenanceFormDialog from './MaintenanceFormDialog';
import VehicleFormDialog from './VehicleFormDialog';

const HISTORY_PAGE_SIZE = 10;

type TabName = 'history' | 'costs' | 'details';

type OpenDialog =
  | { kind: 'edit' }
  | { kind: 'assign' }
  | { kind: 'delete' }
  | { kind: 'record'; record?: MaintenanceEntry }
  | { kind: 'delete-record'; record: MaintenanceEntry };

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box minWidth={0}>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography component="div" fontWeight={600}>
        {children}
      </Typography>
    </Box>
  );
}

/** Records, total cost and share of the cost for each type of maintenance. */
function costByType(history: MaintenanceEntry[]) {
  const totals = new Map<MaintenanceType, { count: number; cost: number }>();
  for (const record of history) {
    const entry = totals.get(record.maintenance_type) ?? { count: 0, cost: 0 };
    entry.count += 1;
    entry.cost += record.cost;
    totals.set(record.maintenance_type, entry);
  }
  const total = history.reduce((sum, record) => sum + record.cost, 0);
  return [...totals.entries()]
    .map(([type, entry]) => ({ type, ...entry, share: total > 0 ? entry.cost / total : 0 }))
    .sort((a, b) => b.cost - a.cost);
}

function OverdueBanner({ vehicle, onRecord }: { vehicle: VehicleDetail; onRecord?: () => void }) {
  if (!isOverdue(vehicle)) {
    return null;
  }
  return (
    <Alert
      severity="warning"
      variant="outlined"
      action={
        onRecord && (
          <Button color="inherit" size="small" onClick={onRecord}>
            Record maintenance
          </Button>
        )
      }
    >
      {vehicle.last_maintenance
        ? `This vehicle needs maintenance: it was last serviced ${daysSince(vehicle.last_maintenance)} days ago.`
        : 'This vehicle needs maintenance: it has never been serviced.'}
    </Alert>
  );
}

export default function VehicleDetailView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const notify = useNotify();
  const { canEdit } = useSession();
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down('md'), { noSsr: true });

  // The list sends its own query string, so "Vehicles" returns to the same search.
  const from = useSearchParams().get('from');
  const listHref = from ? `/vehicles?${from}` : '/vehicles';
  const breadcrumbs = [{ label: 'Vehicles', href: listHref }];

  const detail = useVehicleDetail(id);
  const deleteVehicle = useDeleteVehicle();
  const deleteRecord = useDeleteMaintenanceRecord();

  const [tab, setTab] = useState<TabName>('history');
  const [dialog, setDialog] = useState<OpenDialog | null>(null);
  const [historyPage, setHistoryPage] = useState(0);
  const closeDialog = () => setDialog(null);

  if (detail.isPending) {
    return (
      <Stack spacing={3}>
        <Skeleton variant="text" width={160} />
        <Skeleton variant="text" width="45%" height={48} />
        <Skeleton variant="rounded" height={96} />
        <Skeleton variant="rounded" height={360} />
      </Stack>
    );
  }

  if (detail.isError) {
    const notFound = parseApiError(detail.error).status === 404;
    return (
      <Stack spacing={3}>
        <PageHeader title={notFound ? 'Vehicle not found' : 'Vehicle'} breadcrumbs={breadcrumbs} />
        {notFound ? (
          <Card>
            <EmptyState
              icon={<SearchOffIcon />}
              title="There is no vehicle at this address"
              description="It may have been deleted, or the link may be wrong."
              action={
                <Button component={Link} href={listHref} variant="outlined">
                  Back to vehicles
                </Button>
              }
            />
          </Card>
        ) : (
          <ErrorState error={detail.error} onRetry={() => detail.refetch()} />
        )}
      </Stack>
    );
  }

  const vehicle = detail.data;
  const name = vehicleName(vehicle);
  const history = vehicle.maintenance_history;
  const hasHistory = history.length > 0;
  const totalCost = history.reduce((sum, record) => sum + record.cost, 0);
  const costs = costByType(history);

  // After deleting records the current page may not exist any more.
  const lastPage = Math.max(0, Math.ceil(history.length / HISTORY_PAGE_SIZE) - 1);
  const page = Math.min(historyPage, lastPage);
  const visibleHistory = history.slice(page * HISTORY_PAGE_SIZE, (page + 1) * HISTORY_PAGE_SIZE);

  const record = () => setDialog({ kind: 'record' });

  const handleDeleteVehicle = () => {
    deleteVehicle.mutate(vehicle.id, {
      onSuccess: () => {
        notify(`${name} was deleted.`);
        router.push(listHref);
      },
      onError: (error) => {
        notify(parseApiError(error).message, 'error');
        closeDialog();
      },
    });
  };

  const handleDeleteRecord = (entry: MaintenanceEntry) => {
    deleteRecord.mutate(entry.id, {
      onSuccess: () => notify('The maintenance record was deleted.'),
      onError: (error) => notify(parseApiError(error).message, 'error'),
      onSettled: closeDialog,
    });
  };

  const vehicleActions: RowAction[] = [
    {
      label: 'Move to office',
      icon: <SwapHorizIcon fontSize="small" />,
      onClick: () => setDialog({ kind: 'assign' }),
    },
    {
      label: 'Delete vehicle',
      icon: <DeleteOutlineIcon fontSize="small" />,
      danger: true,
      onClick: () => setDialog({ kind: 'delete' }),
      disabledReason: hasHistory
        ? 'A vehicle with maintenance records cannot be deleted. Set it to inactive instead.'
        : undefined,
    },
  ];

  const recordActions = (entry: MaintenanceEntry): RowAction[] => [
    {
      label: 'Edit',
      icon: <EditOutlinedIcon fontSize="small" />,
      onClick: () => setDialog({ kind: 'record', record: entry }),
    },
    {
      label: 'Delete',
      icon: <DeleteOutlineIcon fontSize="small" />,
      danger: true,
      onClick: () => setDialog({ kind: 'delete-record', record: entry }),
    },
  ];

  const recordLabel = (entry: MaintenanceEntry) =>
    `${MAINTENANCE_TYPE_LABELS[entry.maintenance_type]} of ${formatDate(entry.maintenance_date)}`;

  const historyTable = (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Mechanic</TableCell>
            <TableCell align="right">Cost</TableCell>
            <TableCell>Notes</TableCell>
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
          {visibleHistory.map((entry) => (
            <TableRow key={entry.id} hover>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>
                {formatDate(entry.maintenance_date)}
              </TableCell>
              <TableCell>
                <Chip size="small" label={MAINTENANCE_TYPE_LABELS[entry.maintenance_type]} />
              </TableCell>
              <TableCell>
                {entry.mechanic.name}
                <Typography variant="caption" color="text.secondary" display="block">
                  {entry.mechanic.certification_number}
                </Typography>
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                {formatCurrency(entry.cost)}
              </TableCell>
              <TableCell sx={{ maxWidth: 300, color: 'text.secondary' }}>{entry.notes}</TableCell>
              {canEdit && (
                <TableCell align="right">
                  <RowActions subject={recordLabel(entry)} actions={recordActions(entry)} />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const historyCards = (
    <Stack spacing={1.5} p={2}>
      {visibleHistory.map((entry) => (
        <Card key={entry.id} sx={{ p: 2 }}>
          <Box display="flex" justifyContent="space-between" gap={1}>
            <Box minWidth={0}>
              <Typography fontWeight={600}>
                {MAINTENANCE_TYPE_LABELS[entry.maintenance_type]} · {formatCurrency(entry.cost)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatDate(entry.maintenance_date)} · {entry.mechanic.name}
              </Typography>
            </Box>
            {canEdit && <RowActions subject={recordLabel(entry)} actions={recordActions(entry)} />}
          </Box>
          {entry.notes && (
            <Typography variant="body2" mt={1}>
              {entry.notes}
            </Typography>
          )}
        </Card>
      ))}
    </Stack>
  );

  return (
    <Stack spacing={3}>
      <PageHeader
        title={name}
        breadcrumbs={breadcrumbs}
        badges={
          <>
            <ActiveChip active={vehicle.is_active} size="medium" />
            <OverdueChip vehicle={vehicle} size="medium" />
          </>
        }
        description={
          <Box component="span" fontFamily="var(--font-geist-mono)">
            {vehicle.vin}
          </Box>
        }
        actions={
          canEdit && (
            <>
              <Button variant="contained" startIcon={<AddIcon />} onClick={record}>
                Record maintenance
              </Button>
              <Button
                variant="outlined"
                startIcon={<EditOutlinedIcon />}
                onClick={() => setDialog({ kind: 'edit' })}
              >
                Edit
              </Button>
              <RowActions subject={name} actions={vehicleActions} />
            </>
          )
        }
      />

      <OverdueBanner vehicle={vehicle} onRecord={canEdit ? record : undefined} />

      <Card>
        <CardContent>
          <Box display="grid" gap={3} gridTemplateColumns={{ xs: '1fr 1fr', md: 'repeat(5, 1fr)' }}>
            <Fact label="License plate">{vehicle.license_plate}</Fact>
            <Fact label="Office">
              <MuiLink
                component={Link}
                href={`/vehicles?office=${vehicle.office.id}`}
                underline="hover"
              >
                {vehicle.office.name}
              </MuiLink>
              <Typography variant="body2" color="text.secondary">
                {vehicle.office.city}
              </Typography>
            </Fact>
            <Fact label="Last maintenance">
              {formatDate(vehicle.last_maintenance)}
              {vehicle.last_maintenance && (
                <Typography variant="body2" color="text.secondary">
                  {daysSince(vehicle.last_maintenance)} days ago
                </Typography>
              )}
            </Fact>
            <Fact label="Maintenance records">{history.length}</Fact>
            <Fact label="Total maintenance cost">{formatCurrency(totalCost)}</Fact>
          </Box>
        </CardContent>
      </Card>

      <Paper variant="outlined">
        <LinearProgress sx={{ visibility: detail.isFetching ? 'visible' : 'hidden' }} />
        <Tabs
          value={tab}
          onChange={(_, value: TabName) => setTab(value)}
          variant="scrollable"
          allowScrollButtonsMobile
          sx={{ px: 1, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab value="history" label={`Maintenance history (${history.length})`} />
          <Tab value="costs" label="Cost by type" disabled={!hasHistory} />
          <Tab value="details" label="Details" />
        </Tabs>

        {tab === 'history' &&
          (!hasHistory ? (
            <EmptyState
              icon={<BuildOutlinedIcon />}
              title="No maintenance yet"
              description="This vehicle has never been serviced."
              action={
                canEdit && (
                  <Button variant="outlined" startIcon={<AddIcon />} onClick={record}>
                    Record maintenance
                  </Button>
                )
              }
            />
          ) : (
            <>
              {isPhone ? historyCards : historyTable}
              <TablePagination
                component="div"
                count={history.length}
                page={page}
                rowsPerPage={HISTORY_PAGE_SIZE}
                rowsPerPageOptions={[HISTORY_PAGE_SIZE]}
                onPageChange={(_, next) => setHistoryPage(next)}
              />
            </>
          ))}

        {tab === 'costs' && (
          <Stack spacing={2.5} p={3}>
            {costs.map((row) => (
              <Box key={row.type}>
                <Box display="flex" justifyContent="space-between" gap={2} mb={0.75}>
                  <Typography fontWeight={600}>
                    {MAINTENANCE_TYPE_LABELS[row.type]}{' '}
                    <Typography component="span" variant="body2" color="text.secondary">
                      · {row.count} {row.count === 1 ? 'record' : 'records'}
                    </Typography>
                  </Typography>
                  <Typography fontWeight={600} whiteSpace="nowrap">
                    {formatCurrency(row.cost)}{' '}
                    <Typography component="span" variant="body2" color="text.secondary">
                      ({Math.round(row.share * 100)}%)
                    </Typography>
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={row.share * 100}
                  aria-hidden
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            ))}
          </Stack>
        )}

        {tab === 'details' && (
          <Box
            component="dl"
            display="grid"
            gridTemplateColumns={{ xs: '1fr', sm: '200px 1fr' }}
            columnGap={3}
            rowGap={{ xs: 0.25, sm: 1.5 }}
            p={3}
            m={0}
            sx={{
              '& dt': { color: 'text.secondary' },
              '& dd': { m: 0, fontWeight: 500, mb: { xs: 1.5, sm: 0 } },
            }}
          >
            <dt>VIN</dt>
            <dd style={{ fontFamily: 'var(--font-geist-mono)' }}>{vehicle.vin}</dd>
            <dt>License plate</dt>
            <dd>{vehicle.license_plate}</dd>
            <dt>Make and model</dt>
            <dd>
              {vehicle.make} {vehicle.model}
            </dd>
            <dt>Year</dt>
            <dd>{vehicle.year}</dd>
            <dt>Office</dt>
            <dd>
              {vehicle.office.name}, {vehicle.office.city}
            </dd>
            <dt>Status</dt>
            <dd>{vehicle.is_active ? 'Active' : 'Inactive'}</dd>
            <dt>Added</dt>
            <dd>{formatDateTime(vehicle.created_at)}</dd>
            <dt>Last changed</dt>
            <dd>{formatDateTime(vehicle.updated_at)}</dd>
          </Box>
        )}
      </Paper>

      {dialog?.kind === 'edit' && <VehicleFormDialog vehicle={vehicle} onClose={closeDialog} />}

      {dialog?.kind === 'assign' && <AssignOfficeDialog vehicle={vehicle} onClose={closeDialog} />}

      {dialog?.kind === 'record' && (
        <MaintenanceFormDialog
          vehicleId={vehicle.id}
          vehicleName={name}
          record={dialog.record}
          onClose={closeDialog}
        />
      )}

      {dialog?.kind === 'delete' && (
        <ConfirmDialog
          title="Delete vehicle?"
          message={
            <>
              <strong>{name}</strong> ({vehicle.vin}) will be deleted. This cannot be undone.
            </>
          }
          loading={deleteVehicle.isPending}
          onConfirm={handleDeleteVehicle}
          onCancel={closeDialog}
        />
      )}

      {dialog?.kind === 'delete-record' && (
        <ConfirmDialog
          title="Delete maintenance record?"
          message={
            <>
              The{' '}
              <strong>
                {MAINTENANCE_TYPE_LABELS[dialog.record.maintenance_type].toLowerCase()}
              </strong>{' '}
              of {formatDate(dialog.record.maintenance_date)} ({formatCurrency(dialog.record.cost)})
              will be deleted. This cannot be undone.
            </>
          }
          loading={deleteRecord.isPending}
          onConfirm={() => handleDeleteRecord(dialog.record)}
          onCancel={closeDialog}
        />
      )}
    </Stack>
  );
}

'use client';

import AddIcon from '@mui/icons-material/Add';
import ApartmentOutlinedIcon from '@mui/icons-material/ApartmentOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  LinearProgress,
  Link as MuiLink,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import Link from 'next/link';
import { useState } from 'react';

import ConfirmDialog from '@/components/ConfirmDialog';
import { useNotify } from '@/components/NotificationProvider';
import PageHeader from '@/components/PageHeader';
import RowActions from '@/components/RowActions';
import { EmptyState, ErrorState } from '@/components/StateViews';
import { parseApiError } from '@/lib/errors';
import { formatCurrency, formatDate } from '@/lib/format';
import { useDeleteOffice, useOfficeSummary } from '@/lib/hooks/useOffices';
import { useSession } from '@/lib/hooks/useSession';
import { OfficeSummary } from '@/lib/types';

import OfficeFormDialog from './OfficeFormDialog';

const GRID_COLUMNS = { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)' };

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Box minWidth={0}>
      <Typography variant="caption" color="text.secondary" display="block" noWrap>
        {label}
      </Typography>
      <Typography fontWeight={600} noWrap>
        {value}
      </Typography>
    </Box>
  );
}

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
  const totalCost = offices.reduce((sum, office) => sum + office.maintenance_cost_last_year, 0);

  const newOfficeButton = canEdit && (
    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setForm({})}>
      New office
    </Button>
  );

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Offices"
        description="Active vehicles and maintenance cost of each office in the last 12 months."
        actions={newOfficeButton}
      />

      {summary.isError ? (
        <ErrorState error={summary.error} onRetry={() => summary.refetch()} />
      ) : summary.isPending ? (
        <Box display="grid" gap={2} gridTemplateColumns={GRID_COLUMNS}>
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} variant="rounded" height={210} />
          ))}
        </Box>
      ) : offices.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ApartmentOutlinedIcon />}
            title="No offices yet"
            description="Create the first office to start assigning vehicles to it."
            action={newOfficeButton}
          />
        </Card>
      ) : (
        <Box>
          {/* Refreshing in the background: keep the cards and show a thin bar. */}
          <LinearProgress
            sx={{ visibility: summary.isFetching ? 'visible' : 'hidden', mb: 1, borderRadius: 1 }}
          />
          <Box
            component="ul"
            aria-label="Offices"
            display="grid"
            gap={2}
            gridTemplateColumns={GRID_COLUMNS}
            sx={{ listStyle: 'none', m: 0, p: 0 }}
          >
            {offices.map((office) => {
              const share = totalCost > 0 ? office.maintenance_cost_last_year / totalCost : 0;
              const percent = Math.round(share * 100);
              return (
                <Card
                  component="li"
                  key={office.id}
                  data-office={office.name}
                  sx={{ display: 'flex', flexDirection: 'column' }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      gap={1}
                    >
                      <Box minWidth={0}>
                        <MuiLink
                          component={Link}
                          href={`/vehicles?office=${office.id}`}
                          underline="hover"
                          color="text.primary"
                          variant="h6"
                          display="block"
                          noWrap
                        >
                          {office.name}
                        </MuiLink>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          display="flex"
                          alignItems="center"
                          gap={0.5}
                        >
                          <PlaceOutlinedIcon sx={{ fontSize: 16 }} />
                          {office.city}
                        </Typography>
                      </Box>
                      {canEdit && (
                        <RowActions
                          subject={office.name}
                          actions={[
                            {
                              label: 'Edit',
                              icon: <EditOutlinedIcon fontSize="small" />,
                              onClick: () => setForm({ office }),
                            },
                            {
                              label: 'Delete',
                              icon: <DeleteOutlineIcon fontSize="small" />,
                              danger: true,
                              onClick: () => setToDelete(office),
                            },
                          ]}
                        />
                      )}
                    </Box>

                    <Box display="grid" gridTemplateColumns="1fr 1fr" gap={1.5} mt={2.5}>
                      <Stat label="Active vehicles" value={office.active_vehicle_count} />
                      <Stat
                        label="Cost, 12 months"
                        value={formatCurrency(office.maintenance_cost_last_year)}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" mt={1.5}>
                      Last service: {formatDate(office.last_maintenance)}
                    </Typography>

                    <Box mt={2}>
                      <Box display="flex" justifyContent="space-between" mb={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          Share of the fleet cost
                        </Typography>
                        <Typography variant="caption" fontWeight={600}>
                          {percent}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={share * 100}
                        aria-label={`${percent}% of the fleet cost`}
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </Box>
                  </CardContent>
                  <Divider />
                  <Button
                    component={Link}
                    href={`/vehicles?office=${office.id}`}
                    startIcon={<LocalShippingOutlinedIcon />}
                    fullWidth
                    sx={{ borderRadius: 0, py: 1.25 }}
                  >
                    View vehicles
                  </Button>
                </Card>
              );
            })}
          </Box>
        </Box>
      )}

      {form && <OfficeFormDialog office={form.office} onClose={() => setForm(null)} />}

      {toDelete && (
        <ConfirmDialog
          title="Delete office?"
          message={
            <>
              <strong>{toDelete.name}</strong> will be deleted. An office that still has vehicles
              cannot be deleted: move them to another office first.
            </>
          }
          loading={deleteOffice.isPending}
          onConfirm={handleDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </Stack>
  );
}

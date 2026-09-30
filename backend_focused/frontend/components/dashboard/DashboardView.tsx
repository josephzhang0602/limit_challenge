'use client';

import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EngineeringOutlinedIcon from '@mui/icons-material/EngineeringOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  LinearProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Skeleton,
  Typography,
} from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import Link from 'next/link';
import { ReactNode } from 'react';

import PageHeader from '@/components/PageHeader';
import { EmptyState, ErrorState } from '@/components/StateViews';
import { formatCurrency, formatDate } from '@/lib/format';
import { useActiveMechanicCount, useMechanicWorkload } from '@/lib/hooks/useMechanics';
import { useOfficeSummary } from '@/lib/hooks/useOffices';
import { useSession } from '@/lib/hooks/useSession';
import { useVehicleList } from '@/lib/hooks/useVehicles';
import { VehicleListParams } from '@/lib/types';
import { daysSince, vehicleName } from '@/lib/vehicles';

const TOP = 5;

const OVERDUE_PARAMS: VehicleListParams = {
  office: '',
  is_active: '',
  make: '',
  model: '',
  maintained_from: '',
  maintained_to: '',
  mechanic_certification: '',
  ordering: '',
  overdue: true,
  page: 1,
  page_size: TOP,
};

type Tone = 'primary' | 'warning' | 'success' | 'info';

function StatCard({
  label,
  value,
  hint,
  icon,
  tone,
  loading,
  href,
}: {
  label: string;
  value: ReactNode;
  hint: string;
  icon: ReactNode;
  tone: Tone;
  loading: boolean;
  href?: string;
}) {
  const content = (
    <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
      <Avatar variant="rounded" sx={{ bgcolor: `${tone}.main`, width: 44, height: 44 }}>
        {icon}
      </Avatar>
      <Box minWidth={0}>
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          {label}
        </Typography>
        <Typography variant="h5" component="p" sx={{ my: 0.25 }}>
          {loading ? <Skeleton width={80} /> : value}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      </Box>
    </CardContent>
  );

  return (
    <Card sx={{ height: '100%' }}>
      {href ? (
        <Box
          component={Link}
          href={href}
          sx={{ color: 'inherit', textDecoration: 'none', display: 'block', height: '100%' }}
        >
          {content}
        </Box>
      ) : (
        content
      )}
    </Card>
  );
}

function ViewAll({ href }: { href: string }) {
  return (
    <Button component={Link} href={href} size="small" endIcon={<ArrowForwardIcon />}>
      View all
    </Button>
  );
}

export default function DashboardView() {
  const { user } = useSession();
  const offices = useOfficeSummary();
  const overdue = useVehicleList(OVERDUE_PARAMS);
  const workload = useMechanicWorkload(1, TOP);
  const activeMechanics = useActiveMechanicCount();

  const officeRows = offices.data ?? [];
  const activeVehicles = officeRows.reduce((sum, office) => sum + office.active_vehicle_count, 0);
  const yearCost = officeRows.reduce((sum, office) => sum + office.maintenance_cost_last_year, 0);
  // Largest first, so the chart reads from top to bottom.
  const chartRows = [...officeRows].sort(
    (a, b) => b.maintenance_cost_last_year - a.maintenance_cost_last_year,
  );

  const busiest = workload.data?.results ?? [];
  const maxJobs = Math.max(1, ...busiest.map((mechanic) => mechanic.maintenance_count));

  return (
    <Box display="grid" gap={3}>
      <PageHeader
        title="Dashboard"
        description={`Welcome back${user ? `, ${user.name.split(' ')[0]}` : ''}. Here is the state of the fleet today.`}
      />

      <Box
        display="grid"
        gap={2}
        gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' }}
      >
        <StatCard
          label="Active vehicles"
          value={activeVehicles}
          hint={`In ${officeRows.length} offices`}
          icon={<LocalShippingOutlinedIcon />}
          tone="primary"
          loading={offices.isPending}
          href="/vehicles?is_active=true"
        />
        <StatCard
          label="Need maintenance"
          value={overdue.data?.count ?? 0}
          hint="Overdue for service"
          icon={<WarningAmberRoundedIcon />}
          tone="warning"
          loading={overdue.isPending}
          href="/vehicles?overdue=1"
        />
        <StatCard
          label="Cost, last 12 months"
          value={formatCurrency(yearCost)}
          hint="All offices"
          icon={<PaymentsOutlinedIcon />}
          tone="success"
          loading={offices.isPending}
          href="/offices"
        />
        <StatCard
          label="Active mechanics"
          value={activeMechanics.data ?? 0}
          hint="Can receive new work"
          icon={<EngineeringOutlinedIcon />}
          tone="info"
          loading={activeMechanics.isPending}
          href="/mechanics"
        />
      </Box>

      <Box display="grid" gap={3} gridTemplateColumns={{ xs: '1fr', lg: '3fr 2fr' }}>
        <Card>
          <CardHeader
            title="Maintenance cost by office"
            subheader="Last 12 months"
            action={<ViewAll href="/offices" />}
            slotProps={{ title: { variant: 'h6' } }}
          />
          <CardContent sx={{ pt: 0 }}>
            {offices.isError ? (
              <ErrorState error={offices.error} onRetry={() => offices.refetch()} />
            ) : offices.isPending ? (
              <Skeleton variant="rounded" height={320} />
            ) : chartRows.length === 0 ? (
              <EmptyState title="No offices yet" />
            ) : (
              <BarChart
                dataset={chartRows.map((office) => ({
                  name: office.name,
                  cost: office.maintenance_cost_last_year,
                }))}
                layout="horizontal"
                yAxis={[{ scaleType: 'band', dataKey: 'name', width: 150 }]}
                xAxis={[{ valueFormatter: (value: number) => `$${Math.round(value / 1000)}k` }]}
                series={[
                  {
                    dataKey: 'cost',
                    label: 'Cost',
                    valueFormatter: (value) => formatCurrency(value ?? 0),
                  },
                ]}
                height={Math.max(240, chartRows.length * 42)}
                borderRadius={6}
                hideLegend
                margin={{ left: 0, right: 32 }}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Most overdue vehicles"
            subheader="Service these first"
            action={<ViewAll href="/vehicles?overdue=1" />}
            slotProps={{ title: { variant: 'h6' } }}
          />
          {overdue.isError ? (
            <CardContent>
              <ErrorState error={overdue.error} onRetry={() => overdue.refetch()} />
            </CardContent>
          ) : overdue.isPending ? (
            <CardContent>
              <Skeleton variant="rounded" height={240} />
            </CardContent>
          ) : (overdue.data?.results.length ?? 0) === 0 ? (
            <EmptyState
              title="Nothing is overdue"
              description="Every active vehicle was serviced in the last year."
            />
          ) : (
            <List disablePadding>
              {overdue.data?.results.map((vehicle) => (
                <ListItem key={vehicle.id} disablePadding divider>
                  <ListItemButton
                    component={Link}
                    href={`/vehicles/${vehicle.id}`}
                    sx={{ px: 2.5, borderRadius: 0 }}
                  >
                    <ListItemText
                      primary={vehicleName(vehicle)}
                      secondary={`${vehicle.license_plate} · ${vehicle.office.name}`}
                    />
                    <Typography
                      variant="body2"
                      color="warning.main"
                      fontWeight={600}
                      textAlign="right"
                      whiteSpace="nowrap"
                      ml={2}
                    >
                      {vehicle.last_maintenance
                        ? `${daysSince(vehicle.last_maintenance)} days`
                        : 'Never serviced'}
                      <Typography variant="caption" color="text.secondary" display="block">
                        {vehicle.last_maintenance ? formatDate(vehicle.last_maintenance) : ''}
                      </Typography>
                    </Typography>
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </Card>
      </Box>

      <Card>
        <CardHeader
          title="Busiest mechanics"
          subheader={`Maintenance completed in ${new Date().getFullYear()}`}
          action={<ViewAll href="/mechanics" />}
          slotProps={{ title: { variant: 'h6' } }}
        />
        <CardContent sx={{ pt: 0 }}>
          {workload.isError ? (
            <ErrorState error={workload.error} onRetry={() => workload.refetch()} />
          ) : workload.isPending ? (
            <Skeleton variant="rounded" height={200} />
          ) : busiest.length === 0 ? (
            <EmptyState title="No mechanics yet" />
          ) : (
            <Box display="grid" gap={2}>
              {busiest.map((mechanic) => (
                <Box
                  key={mechanic.id}
                  display="grid"
                  gridTemplateColumns={{ xs: '1fr auto', sm: '220px 1fr 140px' }}
                  alignItems="center"
                  gap={{ xs: 0.5, sm: 2 }}
                >
                  <Box minWidth={0}>
                    <Typography fontWeight={600} noWrap>
                      {mechanic.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {mechanic.certification_number}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(mechanic.maintenance_count / maxJobs) * 100}
                    aria-label={`${mechanic.maintenance_count} jobs`}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      gridColumn: { xs: '1 / -1', sm: 'auto' },
                      gridRow: { xs: 2, sm: 'auto' },
                    }}
                  />
                  <Typography variant="body2" textAlign="right">
                    <strong>{mechanic.maintenance_count}</strong> jobs ·{' '}
                    {formatCurrency(mechanic.total_cost)}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

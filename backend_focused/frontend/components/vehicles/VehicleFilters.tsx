'use client';

import {
  Box,
  Button,
  Card,
  CardContent,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback } from 'react';

import DebouncedTextField from '@/components/DebouncedTextField';
import { todayIso } from '@/lib/format';
import { useOfficeOptions } from '@/lib/hooks/useOffices';
import { VehicleListParams } from '@/lib/types';

/** The filters of the vehicle search. Each one is a query parameter of the API. */
export const FILTER_KEYS = [
  'office',
  'is_active',
  'make',
  'model',
  'maintained_from',
  'maintained_to',
  'mechanic_certification',
  'overdue',
] as const;

type FilterKey = (typeof FILTER_KEYS)[number];

// Without this, a select whose value is '' shows nothing instead of "All offices".
const SHOW_EMPTY_OPTION = {
  select: { displayEmpty: true },
  inputLabel: { shrink: true },
};

interface VehicleFiltersProps {
  filters: VehicleListParams;
  activeCount: number;
  onChange: (changes: Partial<Record<FilterKey, string | null>>) => void;
  onClear: () => void;
}

export default function VehicleFilters({
  filters,
  activeCount,
  onChange,
  onClear,
}: VehicleFiltersProps) {
  const offices = useOfficeOptions();

  // One stable function per text filter, so the debounce timer is not restarted.
  const commitMake = useCallback((value: string) => onChange({ make: value }), [onChange]);
  const commitModel = useCallback((value: string) => onChange({ model: value }), [onChange]);
  const commitCertification = useCallback(
    (value: string) => onChange({ mechanic_certification: value }),
    [onChange],
  );

  const rangeIsReversed =
    filters.maintained_from !== '' &&
    filters.maintained_to !== '' &&
    filters.maintained_from > filters.maintained_to;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" component="h2" fontWeight={600}>
              Filters{activeCount > 0 && ` (${activeCount})`}
            </Typography>
            <Button size="small" onClick={onClear} disabled={activeCount === 0}>
              Clear filters
            </Button>
          </Box>

          <Box
            display="grid"
            gap={2}
            gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }}
          >
            <TextField
              select
              size="small"
              label="Office"
              value={offices.data ? filters.office : ''}
              onChange={(event) => onChange({ office: event.target.value })}
              disabled={offices.isPending}
              error={offices.isError}
              helperText={offices.isError ? 'Offices could not be loaded.' : undefined}
              slotProps={SHOW_EMPTY_OPTION}
            >
              <MenuItem value="">All offices</MenuItem>
              {offices.data?.map((office) => (
                <MenuItem key={office.id} value={String(office.id)}>
                  {office.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              label="Status"
              value={filters.is_active}
              onChange={(event) => onChange({ is_active: event.target.value })}
              slotProps={SHOW_EMPTY_OPTION}
            >
              <MenuItem value="">Active and inactive</MenuItem>
              <MenuItem value="true">Active</MenuItem>
              <MenuItem value="false">Inactive</MenuItem>
            </TextField>

            <DebouncedTextField
              size="small"
              label="Make"
              placeholder="Ford"
              value={filters.make}
              onCommit={commitMake}
            />

            <DebouncedTextField
              size="small"
              label="Model"
              placeholder="Transit"
              value={filters.model}
              onCommit={commitModel}
            />

            <TextField
              size="small"
              type="date"
              label="Serviced from"
              value={filters.maintained_from}
              onChange={(event) => onChange({ maintained_from: event.target.value })}
              error={rangeIsReversed}
              helperText={rangeIsReversed ? 'Must be on or before "Serviced to".' : undefined}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: todayIso() } }}
            />

            <TextField
              size="small"
              type="date"
              label="Serviced to"
              value={filters.maintained_to}
              onChange={(event) => onChange({ maintained_to: event.target.value })}
              error={rangeIsReversed}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: todayIso() } }}
            />

            <DebouncedTextField
              size="small"
              label="Mechanic certification"
              placeholder="ASE-123456"
              value={filters.mechanic_certification}
              onCommit={commitCertification}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={filters.overdue}
                  onChange={(event) => onChange({ overdue: event.target.checked ? '1' : null })}
                />
              }
              label="Needs maintenance"
            />
          </Box>

          {filters.overdue && (
            <Typography variant="body2" color="text.secondary">
              Showing active vehicles that were never serviced or were last serviced more than 365
              days ago. The most overdue vehicles come first.
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

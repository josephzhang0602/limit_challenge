'use client';

import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Box, Breadcrumbs, Link as MuiLink, Stack, Typography } from '@mui/material';
import Link from 'next/link';
import { ReactNode } from 'react';

interface Crumb {
  label: string;
  href: string;
}

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** The main buttons of the page, on the right. */
  actions?: ReactNode;
  /** The pages above this one. The current page is added at the end. */
  breadcrumbs?: Crumb[];
  /** Shown next to the title, such as status badges. */
  badges?: ReactNode;
}

/** The same header on every page: where you are, what the page is, what you can do. */
export default function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  badges,
}: PageHeaderProps) {
  return (
    <Stack spacing={1.5}>
      {breadcrumbs && (
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="Breadcrumb">
          {breadcrumbs.map((crumb) => (
            <MuiLink
              key={crumb.href}
              component={Link}
              href={crumb.href}
              underline="hover"
              color="text.secondary"
            >
              {crumb.label}
            </MuiLink>
          ))}
          <Typography color="text.primary" aria-current="page">
            {title}
          </Typography>
        </Breadcrumbs>
      )}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'flex-start' }}
        flexDirection={{ xs: 'column', sm: 'row' }}
        gap={2}
      >
        <Box minWidth={0}>
          <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
            <Typography variant="h4" component="h1">
              {title}
            </Typography>
            {badges}
          </Box>
          {description && (
            <Typography color="text.secondary" component="div" sx={{ mt: 0.5 }}>
              {description}
            </Typography>
          )}
        </Box>
        {actions && (
          <Box display="flex" gap={1} flexShrink={0} flexWrap="wrap">
            {actions}
          </Box>
        )}
      </Box>
    </Stack>
  );
}

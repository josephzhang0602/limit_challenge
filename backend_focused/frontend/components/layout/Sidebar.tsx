'use client';

import ApartmentOutlinedIcon from '@mui/icons-material/ApartmentOutlined';
import EngineeringOutlinedIcon from '@mui/icons-material/EngineeringOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import SpaceDashboardOutlinedIcon from '@mui/icons-material/SpaceDashboardOutlined';
import {
  Avatar,
  Box,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useSession } from '@/lib/hooks/useSession';

import Logo from './Logo';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: <SpaceDashboardOutlinedIcon /> },
  { label: 'Vehicles', href: '/vehicles', icon: <LocalShippingOutlinedIcon /> },
  { label: 'Offices', href: '/offices', icon: <ApartmentOutlinedIcon /> },
  { label: 'Mechanics', href: '/mechanics', icon: <EngineeringOutlinedIcon /> },
];

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useSession();

  return (
    <Box display="flex" flexDirection="column" height="100%">
      <Box px={2.5} py={2.25}>
        <Logo />
      </Box>

      <Box component="nav" aria-label="Main" px={1.5} flexGrow={1}>
        <List disablePadding sx={{ display: 'grid', gap: 0.5 }}>
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <ListItem key={item.href} disablePadding>
                <ListItemButton
                  component={Link}
                  href={item.href}
                  selected={active}
                  aria-current={active ? 'page' : undefined}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    slotProps={{ primary: { fontWeight: active ? 600 : 500 } }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      {user && (
        <>
          <Divider />
          <Box display="flex" alignItems="center" gap={1.5} px={2.5} py={2}>
            <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: 14 }}>
              {initials(user.name)}
            </Avatar>
            <Box minWidth={0}>
              <Typography variant="body2" fontWeight={600} noWrap>
                {user.name}
              </Typography>
              <Chip
                size="small"
                variant="outlined"
                label={user.role === 'manager' ? 'Manager' : 'Read only'}
                sx={{ height: 20, fontSize: 11, mt: 0.25 }}
              />
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
}

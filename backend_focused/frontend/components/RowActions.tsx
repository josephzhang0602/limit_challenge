'use client';

import MoreVertIcon from '@mui/icons-material/MoreVert';
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from '@mui/material';
import { ReactNode, useState } from 'react';

export interface RowAction {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  danger?: boolean;
  /** When set, the action is disabled and this explains why. */
  disabledReason?: string;
}

interface RowActionsProps {
  /** What the row is about, for screen readers: "Actions for 2024 Ford Transit". */
  subject: string;
  actions: RowAction[];
}

/** One button with a menu, instead of several buttons in every row. */
export default function RowActions({ subject, actions }: RowActionsProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);

  return (
    <>
      <IconButton
        size="small"
        aria-label={`Actions for ${subject}`}
        aria-haspopup="menu"
        aria-expanded={anchor ? true : undefined}
        onClick={(event) => {
          // The row itself may be a link: the menu must not open it.
          event.stopPropagation();
          setAnchor(event.currentTarget);
        }}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={close}
        onClick={(event) => event.stopPropagation()}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {actions.map((action) => {
          const item = (
            <MenuItem
              key={action.label}
              disabled={Boolean(action.disabledReason)}
              onClick={() => {
                close();
                action.onClick();
              }}
              sx={action.danger ? { color: 'error.main' } : undefined}
            >
              <ListItemIcon sx={action.danger ? { color: 'error.main' } : undefined}>
                {action.icon}
              </ListItemIcon>
              <ListItemText>{action.label}</ListItemText>
            </MenuItem>
          );
          // A disabled item has no mouse events, so the tooltip needs a wrapper.
          return action.disabledReason ? (
            <Tooltip key={action.label} title={action.disabledReason} placement="left">
              <span>{item}</span>
            </Tooltip>
          ) : (
            item
          );
        })}
      </Menu>
    </>
  );
}

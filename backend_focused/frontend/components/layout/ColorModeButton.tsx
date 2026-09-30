'use client';

import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import { IconButton, Tooltip, useColorScheme } from '@mui/material';

/** Switch between light and dark. The choice is remembered by the browser. */
export default function ColorModeButton() {
  const { mode, systemMode, setMode } = useColorScheme();
  // "system" follows the computer; show what is on the screen now.
  const current = mode === 'system' ? systemMode : mode;
  const next = current === 'dark' ? 'light' : 'dark';
  const label = `Switch to ${next} mode`;

  return (
    <Tooltip title={label}>
      <IconButton aria-label={label} onClick={() => setMode(next)}>
        {current === 'dark' ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
      </IconButton>
    </Tooltip>
  );
}

import { alpha, createTheme } from '@mui/material/styles';

const brand = '#2952e3';

/**
 * The look of the whole application, in one place.
 *
 * The colors are CSS variables, one set for each color scheme. Switching
 * between light and dark only changes a class on <html>: no component renders
 * again, and the page does not flash the wrong colors while it loads.
 */
export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: brand },
        success: { main: '#1b7f4b' },
        warning: { main: '#b25e09' },
        error: { main: '#c62828' },
        background: { default: '#f4f6fa', paper: '#ffffff' },
        text: { primary: '#141a2a', secondary: '#5b6479' },
        divider: '#e3e7ef',
      },
    },
    dark: {
      palette: {
        primary: { main: '#8aa4ff' },
        success: { main: '#5cc98f' },
        warning: { main: '#f0a24b' },
        error: { main: '#ff7b7b' },
        background: { default: '#0e1320', paper: '#161d2e' },
        text: { primary: '#e8ecf5', secondary: '#9aa4bb' },
        divider: '#27304a',
      },
    },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
    h4: { fontWeight: 700, fontSize: '1.75rem', letterSpacing: '-0.01em' },
    h5: { fontWeight: 700, letterSpacing: '-0.01em' },
    h6: { fontWeight: 600, fontSize: '1.05rem' },
    subtitle2: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
    overline: { fontWeight: 600, letterSpacing: '0.08em' },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
    },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
    },
    MuiPaper: {
      styleOverrides: {
        outlined: ({ theme }) => ({ borderColor: theme.vars.palette.divider }),
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: ({ theme }) => ({ borderColor: theme.vars.palette.divider }),
        head: ({ theme }) => ({
          color: theme.vars.palette.text.secondary,
          fontSize: '0.75rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          whiteSpace: 'nowrap',
        }),
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600 },
      },
    },
    MuiTooltip: {
      defaultProps: { arrow: true },
    },
    // A visible ring around the control that has the keyboard focus.
    MuiButtonBase: {
      styleOverrides: {
        root: ({ theme }) => ({
          '&.Mui-focusVisible': {
            outline: `2px solid ${theme.vars.palette.primary.main}`,
            outlineOffset: 2,
          },
        }),
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: theme.shape.borderRadius,
          '&.Mui-selected': {
            backgroundColor: alpha(brand, 0.1),
            color: theme.vars.palette.primary.main,
            '& .MuiListItemIcon-root': { color: theme.vars.palette.primary.main },
          },
        }),
      },
    },
  },
});

import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import { Avatar, Box, Typography } from '@mui/material';

export default function Logo() {
  return (
    <Box display="flex" alignItems="center" gap={1.25}>
      <Avatar variant="rounded" sx={{ bgcolor: 'primary.main', width: 34, height: 34 }}>
        <LocalShippingRoundedIcon fontSize="small" />
      </Avatar>
      <Typography variant="h6" component="span" fontWeight={700}>
        Fleet Tracker
      </Typography>
    </Box>
  );
}

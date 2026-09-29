'use client';

import { TextField, TextFieldProps } from '@mui/material';
import { useEffect, useState } from 'react';

type DebouncedTextFieldProps = Omit<TextFieldProps, 'value' | 'onChange'> & {
  value: string;
  /** Called once the user has stopped typing. */
  onCommit: (value: string) => void;
  delay?: number;
};

/**
 * Text field for filters that live in the URL.
 *
 * What the user types is kept here, so typing is instant, and it is sent to
 * the URL only after a pause. Otherwise every key would start a request.
 */
export default function DebouncedTextField({
  value,
  onCommit,
  delay = 400,
  ...props
}: DebouncedTextFieldProps) {
  const [draft, setDraft] = useState(value);
  const [lastValue, setLastValue] = useState(value);

  // The URL changed from outside (Clear filters, back button): follow it.
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(value);
  }

  useEffect(() => {
    if (draft === value) {
      return;
    }
    const timer = setTimeout(() => onCommit(draft.trim()), delay);
    return () => clearTimeout(timer);
  }, [draft, value, delay, onCommit]);

  return <TextField {...props} value={draft} onChange={(event) => setDraft(event.target.value)} />;
}

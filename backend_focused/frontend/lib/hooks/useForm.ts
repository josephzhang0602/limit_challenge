'use client';

import { useCallback, useState } from 'react';

import { parseApiError } from '@/lib/errors';

/**
 * State of a form: the values, the error of each field and the general error.
 *
 * The errors come from the API. Field names of the form are the same as the
 * field names of the API, so an error for `vin` is shown under the VIN input.
 */
export function useForm<T extends object>(initialValues: T) {
  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');

  const setField = useCallback(<K extends keyof T>(name: K, value: T[K]) => {
    setValues((current) => ({ ...current, [name]: value }));
    // The user is fixing this field, so its old message no longer applies.
    setFieldErrors((current) => {
      const rest = { ...current };
      delete rest[name as string];
      return rest;
    });
  }, []);

  const showApiError = useCallback((error: unknown) => {
    const parsed = parseApiError(error);
    setFieldErrors(parsed.fieldErrors);
    setFormError(parsed.message);
  }, []);

  /** Error state of a text field: `<TextField {...form.errorProps('name')} />`. */
  const errorProps = (name: keyof T, helperText?: string) => ({
    error: Boolean(fieldErrors[name as string]),
    helperText: fieldErrors[name as string] ?? helperText,
  });

  return { values, setField, errorProps, formError, showApiError };
}

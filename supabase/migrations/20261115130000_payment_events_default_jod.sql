-- payment_events.currency defaulted to 'IQD', but Wasel settles in JOD. A row written
-- without an explicit currency was therefore recorded in the wrong currency.
-- Only the column default changes: existing rows are left alone, because a stored
-- 'IQD' may have been written deliberately and must be reviewed rather than rewritten.
ALTER TABLE public.payment_events
  ALTER COLUMN currency SET DEFAULT 'JOD';

COMMENT ON COLUMN public.payment_events.currency IS
  'ISO 4217 currency code. Defaults to JOD, the platform settlement currency.';

-- Migration: atomic ops aggregate increment
-- Fixes race condition where concurrent payments.captured events could
-- overwrite each other's revenue increments.

CREATE OR REPLACE FUNCTION increment_ops_aggregate(
  p_metric_date   date,
  p_metric_name   text,
  p_dimension     text,
  p_delta_value   numeric DEFAULT 0,
  p_delta_samples integer DEFAULT 1
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.ops_aggregates (metric_date, metric_name, dimension, value, sample_count, updated_at)
  VALUES (p_metric_date, p_metric_name, p_dimension, p_delta_value, p_delta_samples, NOW())
  ON CONFLICT (metric_date, metric_name, dimension)
  DO UPDATE SET
    value       = ops_aggregates.value + EXCLUDED.value,
    sample_count = ops_aggregates.sample_count + EXCLUDED.sample_count,
    updated_at  = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION increment_ops_aggregate TO authenticated;

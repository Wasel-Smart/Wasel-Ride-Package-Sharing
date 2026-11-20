-- Keep the original key text_pattern_ops index and remove only its exact duplicate.
-- This does not change table data, constraints, or application behavior.
DROP INDEX IF EXISTS public.kv_store_0b1f4071_key_idx1;

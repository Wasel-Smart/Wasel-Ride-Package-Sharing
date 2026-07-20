-- Migration: Profile Change History Tracking
-- Description: Adds comprehensive audit trail for profile updates
-- Author: Amazon Q
-- Date: 2026-01-XX

-- Create profile_change_history table
CREATE TABLE IF NOT EXISTS public.profile_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by UUID NOT NULL REFERENCES public.users(id),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_profile_change_history_user_id ON public.profile_change_history(user_id);
CREATE INDEX idx_profile_change_history_changed_at ON public.profile_change_history(changed_at DESC);
CREATE INDEX idx_profile_change_history_field_name ON public.profile_change_history(field_name);

-- Enable Row Level Security
ALTER TABLE public.profile_change_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own change history
CREATE POLICY profile_change_history_select_own
  ON public.profile_change_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: System can insert change records
CREATE POLICY profile_change_history_insert_system
  ON public.profile_change_history
  FOR INSERT
  WITH CHECK (auth.uid() = changed_by);

-- Grant permissions
GRANT SELECT ON public.profile_change_history TO authenticated;
GRANT INSERT ON public.profile_change_history TO authenticated;

-- Add comment
COMMENT ON TABLE public.profile_change_history IS 'Audit trail for profile field changes with metadata';

-- Create function to automatically log profile changes
CREATE OR REPLACE FUNCTION public.log_profile_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log changes for specific fields
  IF (TG_OP = 'UPDATE') THEN
    IF (OLD.full_name IS DISTINCT FROM NEW.full_name) THEN
      INSERT INTO public.profile_change_history (user_id, field_name, old_value, new_value, changed_by)
      VALUES (NEW.id, 'full_name', OLD.full_name, NEW.full_name, NEW.id);
    END IF;
    
    IF (OLD.email IS DISTINCT FROM NEW.email) THEN
      INSERT INTO public.profile_change_history (user_id, field_name, old_value, new_value, changed_by)
      VALUES (NEW.id, 'email', OLD.email, NEW.email, NEW.id);
    END IF;
    
    IF (OLD.phone_number IS DISTINCT FROM NEW.phone_number) THEN
      INSERT INTO public.profile_change_history (user_id, field_name, old_value, new_value, changed_by)
      VALUES (NEW.id, 'phone_number', OLD.phone_number, NEW.phone_number, NEW.id);
    END IF;
    
    IF (OLD.avatar_url IS DISTINCT FROM NEW.avatar_url) THEN
      INSERT INTO public.profile_change_history (user_id, field_name, old_value, new_value, changed_by)
      VALUES (NEW.id, 'avatar_url', 'changed', 'updated', NEW.id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on users table
DROP TRIGGER IF EXISTS trigger_log_profile_change ON public.users;
CREATE TRIGGER trigger_log_profile_change
  AFTER UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.log_profile_change();

-- Add retention policy (optional - keeps last 1 year of history)
CREATE OR REPLACE FUNCTION public.cleanup_old_profile_changes()
RETURNS void AS $$
BEGIN
  DELETE FROM public.profile_change_history
  WHERE changed_at < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create scheduled job for cleanup (if pg_cron is available)
-- SELECT cron.schedule('cleanup-profile-history', '0 2 * * 0', 'SELECT public.cleanup_old_profile_changes()');

COMMENT ON FUNCTION public.log_profile_change() IS 'Automatically logs profile field changes to audit trail';
COMMENT ON FUNCTION public.cleanup_old_profile_changes() IS 'Removes profile change history older than 1 year';

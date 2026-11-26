-- RLS policies for user-owned tables that had RLS enabled but no policies.
-- Each table stores data belonging to a specific user (user_id or participants).
-- Policies follow least-privilege: users see and modify only their own rows.
-- All blocks are wrapped in DO to skip gracefully if a table does not yet exist.

-- ============================================================================
-- conversations
-- RLS enabled by baseline (deny-all). Policy deferred until column names
-- are confirmed on the live DB (baseline has conflicting definitions).
-- ============================================================================

-- ============================================================================
-- driver_documents
-- ============================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='driver_documents') THEN
    ALTER TABLE public.driver_documents ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='driver_documents' AND policyname='driver_documents_select_own') THEN
      CREATE POLICY driver_documents_select_own ON public.driver_documents
        FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='driver_documents' AND policyname='driver_documents_insert_own') THEN
      CREATE POLICY driver_documents_insert_own ON public.driver_documents
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='driver_documents' AND policyname='driver_documents_update_own_pending') THEN
      CREATE POLICY driver_documents_update_own_pending ON public.driver_documents
        FOR UPDATE
        USING (auth.uid() = user_id AND status = 'pending');
    END IF;
  END IF;
END $$;

-- ============================================================================
-- user_consents (GDPR consent log)
-- ============================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_consents') THEN
    ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_consents' AND policyname='user_consents_select_own') THEN
      CREATE POLICY user_consents_select_own ON public.user_consents
        FOR SELECT
        USING (auth.uid() = (SELECT auth_user_id FROM public.users WHERE id = user_consents.user_id));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_consents' AND policyname='user_consents_insert_own') THEN
      CREATE POLICY user_consents_insert_own ON public.user_consents
        FOR INSERT
        WITH CHECK (auth.uid() = (SELECT auth_user_id FROM public.users WHERE id = user_consents.user_id));
    END IF;
  END IF;
END $$;

-- ============================================================================
-- data_export_requests (GDPR right-to-portability)
-- ============================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='data_export_requests') THEN
    ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='data_export_requests' AND policyname='data_export_requests_select_own') THEN
      CREATE POLICY data_export_requests_select_own ON public.data_export_requests
        FOR SELECT
        USING (auth.uid() = (SELECT auth_user_id FROM public.users WHERE id = data_export_requests.user_id));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='data_export_requests' AND policyname='data_export_requests_insert_own') THEN
      CREATE POLICY data_export_requests_insert_own ON public.data_export_requests
        FOR INSERT
        WITH CHECK (auth.uid() = (SELECT auth_user_id FROM public.users WHERE id = data_export_requests.user_id));
    END IF;
  END IF;
END $$;

-- ============================================================================
-- data_deletion_requests (GDPR right-to-erasure)
-- ============================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='data_deletion_requests') THEN
    ALTER TABLE public.data_deletion_requests ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='data_deletion_requests' AND policyname='data_deletion_requests_select_own') THEN
      CREATE POLICY data_deletion_requests_select_own ON public.data_deletion_requests
        FOR SELECT
        USING (auth.uid() = (SELECT auth_user_id FROM public.users WHERE id = data_deletion_requests.user_id));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='data_deletion_requests' AND policyname='data_deletion_requests_insert_own') THEN
      CREATE POLICY data_deletion_requests_insert_own ON public.data_deletion_requests
        FOR INSERT
        WITH CHECK (auth.uid() = (SELECT auth_user_id FROM public.users WHERE id = data_deletion_requests.user_id));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='data_deletion_requests' AND policyname='data_deletion_requests_cancel_own') THEN
      CREATE POLICY data_deletion_requests_cancel_own ON public.data_deletion_requests
        FOR UPDATE
        USING (
          auth.uid() = (SELECT auth_user_id FROM public.users WHERE id = data_deletion_requests.user_id)
          AND status = 'pending'
        )
        WITH CHECK (status = 'cancelled');
    END IF;
  END IF;
END $$;

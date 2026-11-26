-- RLS policies for user-owned tables that had RLS enabled but no policies.
-- Each table stores data belonging to a specific user (user_id or participants).
-- Policies follow least-privilege: users see and modify only their own rows.

-- ============================================================================
-- conversations
-- A conversation belongs to two participants (user1_id, user2_id).
-- Either participant may read; neither may delete (soft-close only).
-- ============================================================================
CREATE POLICY conversations_select_participant ON public.conversations
  FOR SELECT
  USING (
    auth.uid() = user1_id
    OR auth.uid() = user2_id
  );

-- Only the system (service role) creates conversations; users cannot INSERT.
-- Users may update (e.g. mark as read) but only their own side.
CREATE POLICY conversations_update_participant ON public.conversations
  FOR UPDATE
  USING (
    auth.uid() = user1_id
    OR auth.uid() = user2_id
  );

-- ============================================================================
-- driver_documents
-- A driver uploads their own documents; admins verify them.
-- ============================================================================
CREATE POLICY driver_documents_select_own ON public.driver_documents
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY driver_documents_insert_own ON public.driver_documents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Drivers may update their own pending documents (e.g. re-upload a rejected doc).
CREATE POLICY driver_documents_update_own_pending ON public.driver_documents
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND status = 'pending'
  );

-- ============================================================================
-- user_consents (GDPR consent log)
-- Users insert their own consent records; records are immutable after creation.
-- ============================================================================
CREATE POLICY user_consents_select_own ON public.user_consents
  FOR SELECT
  USING (auth.uid() = (
    SELECT auth_user_id FROM public.users WHERE id = user_consents.user_id
  ));

CREATE POLICY user_consents_insert_own ON public.user_consents
  FOR INSERT
  WITH CHECK (auth.uid() = (
    SELECT auth_user_id FROM public.users WHERE id = user_consents.user_id
  ));

-- No UPDATE or DELETE: consent records are an immutable audit trail.

-- ============================================================================
-- data_export_requests (GDPR right-to-portability)
-- Users submit and view their own export requests.
-- ============================================================================
CREATE POLICY data_export_requests_select_own ON public.data_export_requests
  FOR SELECT
  USING (auth.uid() = (
    SELECT auth_user_id FROM public.users WHERE id = data_export_requests.user_id
  ));

CREATE POLICY data_export_requests_insert_own ON public.data_export_requests
  FOR INSERT
  WITH CHECK (auth.uid() = (
    SELECT auth_user_id FROM public.users WHERE id = data_export_requests.user_id
  ));

-- Status transitions (pending -> processing -> completed) are made by the
-- service role; users may not update their own requests.

-- ============================================================================
-- data_deletion_requests (GDPR right-to-erasure)
-- Users submit one pending deletion request; they can view it.
-- The unique index prevents duplicate pending requests per user.
-- ============================================================================
CREATE POLICY data_deletion_requests_select_own ON public.data_deletion_requests
  FOR SELECT
  USING (auth.uid() = (
    SELECT auth_user_id FROM public.users WHERE id = data_deletion_requests.user_id
  ));

CREATE POLICY data_deletion_requests_insert_own ON public.data_deletion_requests
  FOR INSERT
  WITH CHECK (auth.uid() = (
    SELECT auth_user_id FROM public.users WHERE id = data_deletion_requests.user_id
  ));

-- Users may cancel a pending request (set status = 'cancelled').
CREATE POLICY data_deletion_requests_cancel_own ON public.data_deletion_requests
  FOR UPDATE
  USING (
    auth.uid() = (
      SELECT auth_user_id FROM public.users WHERE id = data_deletion_requests.user_id
    )
    AND status = 'pending'
  )
  WITH CHECK (status = 'cancelled');

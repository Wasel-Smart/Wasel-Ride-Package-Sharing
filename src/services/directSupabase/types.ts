// ─── Raw DB row types ────────────────────────────────────────────────────────

export type DbClient = any;

export type RawProfile = {
  id?: string;
  canonical_user_id?: string;
  email?: string | null;
  full_name?: string | null;
  role?: string | null;
  phone?: string | null;
  phone_number?: string | null;
  phone_verified?: boolean | null;
  email_verified?: boolean | null;
  wallet_balance?: number | string | null;
  rating_as_driver?: number | string | null;
  rating?: number | string | null;
  total_trips?: number | string | null;
  trip_count?: number | string | null;
  id_verified?: boolean | null;
  is_verified?: boolean | null;
  verified?: boolean | null;
  sanad_verified?: boolean | null;
  verification_level?: string | null;
  wallet_status?: string | null;
  avatar_url?: string | null;
  two_factor_enabled?: boolean | null;
  created_at?: string | null;
};

export type UserRow = {
  id: string;
  auth_user_id?: string | null;
  email?: string | null;
  full_name?: string | null;
  phone_number?: string | null;
  role?: string | null;
  verification_level?: string | null;
  sanad_verified_status?: string | null;
  phone_verified_at?: string | null;
  avatar_url?: string | null;
  two_factor_enabled?: boolean | null;
  two_factor_secret?: string | null;
  two_factor_backup_codes?: string[] | null;
  created_at?: string | null;
};

export type DriverRow = {
  driver_id: string;
  user_id: string;
  driver_status?: string | null;
  verification_level?: string | null;
  sanad_identity_linked?: boolean | null;
  created_at?: string | null;
};

export type WalletRow = {
  wallet_id?: string;
  user_id?: string;
  balance?: number | string | null;
  pending_balance?: number | string | null;
  wallet_status?: string | null;
  currency_code?: string | null;
  created_at?: string | null;
};

export type TripRow = {
  trip_id?: string;
  driver_id?: string;
  origin_city?: string | null;
  destination_city?: string | null;
  departure_time?: string | null;
  available_seats?: number | string | null;
  price_per_seat?: number | string | null;
  trip_status?: string | null;
  allow_packages?: boolean | null;
  package_capacity?: number | string | null;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

export type RawBooking = {
  id?: string;
  booking_id?: string;
  trip_id?: string;
  passenger_id?: string;
  seats_requested?: number | string;
  seat_number?: number | string | null;
  pickup_location?: string | null;
  dropoff_location?: string | null;
  price_per_seat?: number | string;
  total_price?: number | string;
  amount?: number | string;
  status?: string | null;
  booking_status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type RawPackage = {
  id?: string;
  package_id?: string | null;
  tracking_number?: string;
  package_code?: string | null;
  sender_id?: string;
  receiver_name?: string | null;
  receiver_phone?: string | null;
  origin_name?: string | null;
  origin_location?: string | null;
  destination_name?: string | null;
  destination_location?: string | null;
  size?: string | null;
  weight_kg?: number | string | null;
  description?: string | null;
  trip_id?: string | null;
  status?: string | null;
  package_status?: string | null;
  created_at?: string | null;
};

export type RawNotification = {
  id?: string;
  user_id?: string;
  type?: string;
  title?: string;
  title_ar?: string | null;
  message?: string;
  message_ar?: string | null;
  read?: boolean | null;
  is_read?: boolean | null;
  read_at?: string | null;
  created_at?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type RawCommunicationPreferences = {
  user_id?: string;
  in_app_enabled?: boolean | null;
  push_enabled?: boolean | null;
  email_enabled?: boolean | null;
  sms_enabled?: boolean | null;
  whatsapp_enabled?: boolean | null;
  trip_updates_enabled?: boolean | null;
  booking_requests_enabled?: boolean | null;
  messages_enabled?: boolean | null;
  promotions_enabled?: boolean | null;
  prayer_reminders_enabled?: boolean | null;
  critical_alerts_enabled?: boolean | null;
  preferred_language?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type RawCommunicationDelivery = {
  delivery_id?: string;
  user_id?: string;
  notification_id?: string | null;
  channel?: string | null;
  delivery_status?: string | null;
  destination?: string | null;
  subject?: string | null;
  payload?: Record<string, unknown> | null;
  provider_name?: string | null;
  external_reference?: string | null;
  idempotency_key?: string | null;
  provider_response?: Record<string, unknown> | null;
  error_message?: string | null;
  attempts_count?: number | null;
  last_attempt_at?: string | null;
  next_attempt_at?: string | null;
  locked_at?: string | null;
  processed_by?: string | null;
  queued_at?: string | null;
  sent_at?: string | null;
  delivered_at?: string | null;
  failed_at?: string | null;
  created_at?: string | null;
};

export type RawDemandAlert = {
  id?: string;
  user_id?: string | null;
  origin_city?: string | null;
  destination_city?: string | null;
  service_type?: string | null;
  requested_date?: string | null;
  seats_or_slots?: number | string | null;
  status?: string | null;
  created_at?: string | null;
};

export type RawVerificationRecord = {
  sanad_status?: string | null;
  document_status?: string | null;
  verification_level?: string | null;
  verification_timestamp?: string | null;
  failure_reason?: string | null;
  updated_at?: string | null;
};

export type RawReferral = {
  id?: string;
  referrer_id?: string | null;
  referee_id?: string | null;
  referral_code?: string | null;
  referrer_reward_jod?: number | string | null;
  referee_reward_jod?: number | string | null;
  referee_completed_first_trip?: boolean | null;
  referrer_rewarded?: boolean | null;
  redeemed_at?: string | null;
  completed_at?: string | null;
  rewarded_at?: string | null;
  created_at?: string | null;
};

export type RawGrowthEvent = {
  id?: string;
  user_id?: string | null;
  event_name?: string | null;
  funnel_stage?: string | null;
  service_type?: string | null;
  route_from?: string | null;
  route_to?: string | null;
  monetary_value_jod?: number | string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
};

export type RawRouteReminder = {
  reminder_id?: string;
  user_id?: string;
  corridor_id?: string | null;
  label?: string | null;
  origin_location?: string | null;
  destination_location?: string | null;
  frequency?: string | null;
  preferred_time?: string | null;
  next_reminder_at?: string | null;
  enabled?: boolean | null;
  last_sent_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type RawSupportTicket = {
  ticket_id?: string;
  user_id?: string;
  topic?: string | null;
  subject?: string | null;
  detail?: string | null;
  related_id?: string | null;
  route_label?: string | null;
  status?: string | null;
  priority?: string | null;
  channel?: string | null;
  resolution_summary?: string | null;
  latest_note?: string | null;
  sla_due_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type RawSupportTicketEvent = {
  event_id?: string;
  ticket_id?: string;
  status?: string | null;
  note?: string | null;
  actor_type?: string | null;
  created_at?: string | null;
};

export type RawPricingSnapshot = {
  snapshot_id?: string;
  user_id?: string | null;
  corridor_id?: string | null;
  corridor_key?: string | null;
  route_scope?: string | null;
  origin_location?: string | null;
  destination_location?: string | null;
  base_price_jod?: number | string | null;
  final_price_jod?: number | string | null;
  demand_score?: number | string | null;
  price_pressure?: string | null;
  source_context?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
};

export type RawAutomationJob = {
  job_id?: string;
  user_id?: string | null;
  job_type?: string | null;
  corridor_id?: string | null;
  corridor_key?: string | null;
  route_scope?: string | null;
  origin_location?: string | null;
  destination_location?: string | null;
  job_status?: string | null;
  payload?: Record<string, unknown> | null;
  run_after?: string | null;
  attempts_count?: number | null;
  locked_at?: string | null;
  last_attempt_at?: string | null;
  processed_by?: string | null;
  last_error?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  completed_at?: string | null;
};

export type UserContext = {
  user: UserRow;
  wallet: WalletRow | null;
  verification: RawVerificationRecord | null;
  driver: DriverRow | null;
  authUserId: string;
};

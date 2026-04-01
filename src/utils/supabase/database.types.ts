/**
 * Canonical Supabase database types for the current Wasel app.
 *
 * This file intentionally merges:
 * - the latest production operating model migration family
 * - legacy compatibility tables still referenced by the web app
 *
 * The goal is to keep createClient<Database>() aligned with both the real
 * production schema direction and the tables the app currently queries.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type RowSet<Row, Insert = Partial<Row>, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
};

export interface Database {
  public: {
    Tables: {
      bookings: RowSet<{
        id: string;
        trip_id: string;
        passenger_id: string;
        seats_requested: number | null;
        seats_booked: number | null;
        seat_number: number | null;
        pickup_location: string | null;
        pickup_name: string | null;
        dropoff_location: string | null;
        dropoff_name: string | null;
        price_per_seat: number | null;
        total_price: number | null;
        amount: number | null;
        payment_transaction_id: string | null;
        status: string | null;
        booking_status: string | null;
        confirmed_by_driver: boolean | null;
        driver_rating: number | null;
        passenger_rating: number | null;
        driver_review: string | null;
        passenger_review: string | null;
        created_at: string;
        updated_at: string | null;
      }>;

      communication_deliveries: RowSet<{
        delivery_id: string;
        user_id: string;
        notification_id: string | null;
        channel: 'email' | 'sms' | 'whatsapp' | 'push' | 'in_app' | string;
        delivery_status: 'queued' | 'processing' | 'sent' | 'delivered' | 'failed' | 'cancelled' | string;
        destination: string | null;
        subject: string | null;
        payload: Json | null;
        provider_name: string | null;
        external_reference: string | null;
        idempotency_key: string | null;
        provider_response: Json | null;
        error_message: string | null;
        attempts_count: number | null;
        last_attempt_at: string | null;
        next_attempt_at: string | null;
        locked_at: string | null;
        processed_by: string | null;
        queued_at: string | null;
        sent_at: string | null;
        delivered_at: string | null;
        failed_at: string | null;
        created_at: string;
        updated_at: string;
      }>;

      communication_preferences: RowSet<{
        user_id: string;
        in_app_enabled: boolean | null;
        push_enabled: boolean | null;
        email_enabled: boolean | null;
        sms_enabled: boolean | null;
        whatsapp_enabled: boolean | null;
        trip_updates_enabled: boolean | null;
        booking_requests_enabled: boolean | null;
        messages_enabled: boolean | null;
        promotions_enabled: boolean | null;
        prayer_reminders_enabled: boolean | null;
        critical_alerts_enabled: boolean | null;
        preferred_language: 'en' | 'ar' | null;
        created_at: string;
        updated_at: string;
      }>;

      drivers: RowSet<{
        driver_id: string;
        user_id: string;
        license_number: string;
        vehicle_id: string | null;
        driver_status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'suspended' | 'offline' | 'online' | 'busy';
        verification_level: 'level_0' | 'level_1' | 'level_2' | 'level_3';
        sanad_identity_linked: boolean;
        background_check_status: 'unverified' | 'pending' | 'verified' | 'rejected' | 'expired';
        created_at: string;
        updated_at: string;
      }>;

      notifications: RowSet<{
        id: string;
        user_id: string;
        type: string;
        title: string;
        title_ar: string | null;
        message: string;
        message_ar: string | null;
        read: boolean | null;
        is_read: boolean | null;
        read_at: string | null;
        metadata: Json | null;
        created_at: string;
      }>;

      package_events: RowSet<{
        package_event_id: string;
        package_id: string;
        event_type: string;
        event_status: string;
        notes: string | null;
        created_by: string | null;
        created_at: string;
      }>;

      packages: RowSet<{
        id: string;
        package_id: string | null;
        tracking_number: string;
        qr_code: string;
        sender_id: string;
        receiver_id: string | null;
        receiver_name: string;
        receiver_phone: string;
        origin_name: string;
        origin_location: string;
        destination_name: string;
        destination_location: string;
        size: 'small' | 'medium' | 'large' | 'extra_large';
        weight_kg: number | null;
        description: string | null;
        declared_value: number | null;
        fragile: boolean | null;
        fee_amount: number | null;
        delivery_fee: number | null;
        insurance_fee: number | null;
        trip_id: string | null;
        carrier_id: string | null;
        payment_transaction_id: string | null;
        package_status: 'created' | 'assigned' | 'in_transit' | 'delivered' | 'cancelled' | 'disputed' | null;
        status: string | null;
        delivered_at: string | null;
        picked_up_at: string | null;
        pickup_verified: boolean | null;
        dropoff_verified: boolean | null;
        pickup_signature: string | null;
        dropoff_signature: string | null;
        is_return: boolean | null;
        ecommerce_order_id: string | null;
        return_reason: string | null;
        created_at: string;
        updated_at: string;
      }>;

      payment_methods: RowSet<{
        payment_method_id: string;
        user_id: string;
        provider: string;
        method_type: 'wallet_balance' | 'card_payment' | 'local_gateway' | 'government_api' | string;
        token_reference: string;
        is_default: boolean;
        status: string;
        created_at: string;
        updated_at: string;
      }>;

      profiles: RowSet<{
        id: string;
        email: string | null;
        full_name: string | null;
        phone: string | null;
        phone_number: string | null;
        role: 'rider' | 'driver' | 'both' | 'passenger' | 'admin' | null;
        wallet_balance: number | null;
        balance: number | null;
        rating: number | null;
        rating_as_driver: number | null;
        trip_count: number | null;
        trips: number | null;
        verified: boolean | null;
        id_verified: boolean | null;
        is_verified: boolean | null;
        sanad_verified: boolean | null;
        phone_verified: boolean | null;
        verification_level: string | null;
        wallet_status: string | null;
        avatar_url: string | null;
        created_at: string | null;
        updated_at: string | null;
      }>;

      transactions: RowSet<{
        transaction_id: string;
        wallet_id: string;
        amount: number;
        transaction_type: 'add_funds' | 'withdraw_funds' | 'transfer_funds' | 'ride_payment' | 'package_payment' | 'driver_earning' | 'refund' | 'adjustment' | 'hold' | 'release' | string;
        payment_method: 'wallet_balance' | 'card_payment' | 'local_gateway' | 'government_api' | string;
        transaction_status: 'pending' | 'authorized' | 'posted' | 'failed' | 'reversed' | 'refunded' | string;
        direction: 'debit' | 'credit';
        reference_type: string | null;
        reference_id: string | null;
        metadata: Json;
        created_at: string;
        updated_at: string;
      }>;

      trip_presence: RowSet<{
        trip_presence_id: string;
        trip_id: string;
        driver_id: string;
        active_passengers: number;
        active_packages: number;
        last_location: Json;
        last_heartbeat_at: string;
        created_at: string;
        updated_at: string;
      }>;

      trips: RowSet<{
        id: string;
        trip_id: string | null;
        mode: 'carpooling' | 'on_demand' | 'scheduled' | 'package' | 'return' | null;
        status: string | null;
        trip_status: 'draft' | 'open' | 'booked' | 'in_progress' | 'completed' | 'cancelled' | null;
        driver_id: string | null;
        created_by: string | null;
        origin_name: string | null;
        origin_location: string | null;
        destination_name: string | null;
        destination_location: string | null;
        origin_city: string | null;
        destination_city: string | null;
        from_location: string | null;
        to_location: string | null;
        departure_time: string | null;
        departure_date: string | null;
        total_seats: number | null;
        available_seats: number | null;
        price_per_seat: number | null;
        total_price: number | null;
        gender_preference: 'mixed' | 'women_only' | 'men_only' | 'family_only' | null;
        prayer_stop_enabled: boolean | null;
        prayer_stop_location: string | null;
        prayer_stop_duration_min: number | null;
        allow_packages: boolean | null;
        allows_packages: boolean | null;
        package_capacity: number | null;
        package_capacity_kg: number | null;
        package_slots_remaining: number | null;
        corridor_id: string | null;
        cluster_id: string | null;
        vehicle_make: string | null;
        vehicle_model: string | null;
        notes: string | null;
        deleted_at: string | null;
        created_at: string;
        updated_at: string;
      }>;

      users: RowSet<{
        id: string;
        auth_user_id: string | null;
        full_name: string;
        phone_number: string;
        email: string;
        national_id: string | null;
        national_id_hash: string | null;
        national_id_last4: string | null;
        sanad_verified_status: 'unverified' | 'pending' | 'verified' | 'rejected' | 'expired';
        profile_status: 'pending' | 'active' | 'suspended' | 'blocked';
        role: 'passenger' | 'driver' | 'admin';
        verification_level: 'level_0' | 'level_1' | 'level_2' | 'level_3';
        phone_verified_at: string | null;
        avatar_url: string | null;
        two_factor_enabled: boolean | null;
        two_factor_secret: string | null;
        two_factor_backup_codes: string[] | null;
        created_at: string;
        updated_at: string;
      }>;

      vehicles: RowSet<{
        vehicle_id: string;
        driver_id: string;
        vehicle_type: string;
        plate_number: string;
        capacity: number;
        registration_status: 'pending' | 'active' | 'expired' | 'rejected' | 'suspended';
        created_at: string;
        updated_at: string;
      }>;

      verification_records: RowSet<{
        verification_id: string;
        user_id: string;
        sanad_status: 'unverified' | 'pending' | 'verified' | 'rejected' | 'expired';
        document_status: 'unverified' | 'pending' | 'verified' | 'rejected' | 'expired';
        verification_level: 'level_0' | 'level_1' | 'level_2' | 'level_3';
        verification_timestamp: string;
        provider_reference: string | null;
        document_reference: string | null;
        reviewer_admin_id: string | null;
        failure_reason: string | null;
        created_at: string;
        updated_at: string;
      }>;

      wallets: RowSet<{
        wallet_id: string;
        user_id: string;
        balance: number;
        pending_balance: number;
        wallet_status: 'active' | 'limited' | 'frozen' | 'closed';
        currency_code: string;
        auto_top_up_enabled: boolean | null;
        auto_top_up_amount: number | null;
        auto_top_up_threshold: number | null;
        pin_hash: string | null;
        created_at: string;
        updated_at: string;
      }>;
    };

    Views: {
      [_ in never]: never;
    };

    Functions: {
      app_add_wallet_funds: {
        Args: {
          p_user_id: string;
          p_amount: number;
          p_payment_method: string;
          p_external_reference?: string | null;
        };
        Returns: string;
      };

      app_transfer_wallet_funds: {
        Args: {
          p_from_user_id: string;
          p_to_user_id: string;
          p_amount: number;
          p_payment_method?: string;
        };
        Returns: {
          debit_transaction_id: string;
          credit_transaction_id: string;
        }[];
      };
    };

    Enums: {
      booking_status_v2: 'pending_payment' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'refunded';
      driver_status_v2: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'suspended' | 'offline' | 'online' | 'busy';
      otp_purpose_v2: 'login' | 'wallet_transfer' | 'wallet_withdrawal' | 'driver_action' | 'admin_action';
      package_status_v2: 'created' | 'assigned' | 'in_transit' | 'delivered' | 'cancelled' | 'disputed';
      payment_method_v2: 'wallet_balance' | 'card_payment' | 'local_gateway' | 'government_api';
      profile_status_v2: 'pending' | 'active' | 'suspended' | 'blocked';
      transaction_status_v2: 'pending' | 'authorized' | 'posted' | 'failed' | 'reversed' | 'refunded';
      transaction_type_v2: 'add_funds' | 'withdraw_funds' | 'transfer_funds' | 'ride_payment' | 'package_payment' | 'driver_earning' | 'refund' | 'adjustment' | 'hold' | 'release';
      trip_status_v2: 'draft' | 'open' | 'booked' | 'in_progress' | 'completed' | 'cancelled';
      user_role_v2: 'passenger' | 'driver' | 'admin';
      verification_level_v2: 'level_0' | 'level_1' | 'level_2' | 'level_3';
      verification_status_v2: 'unverified' | 'pending' | 'verified' | 'rejected' | 'expired';
      wallet_status_v2: 'active' | 'limited' | 'frozen' | 'closed';
    };
  };
}

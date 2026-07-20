import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '../lib/config';
import { mobileAuth } from './auth';

export type TripMessageType = 'text' | 'location' | 'system';

type SenderProfile = {
  id?: string;
  full_name?: string | null;
  avatar_url?: string | null;
};

type RawTripMessage = {
  id: string;
  trip_id?: string | null;
  sender_id: string;
  content?: string | null;
  message?: string | null;
  type?: TripMessageType | null;
  message_type?: TripMessageType | null;
  metadata?: Record<string, unknown> | null;
  read_by?: string[] | null;
  read_at?: string | null;
  created_at?: string | null;
  sender?: SenderProfile | SenderProfile[] | null;
  profiles?: SenderProfile | SenderProfile[] | null;
};

export interface TripMessage {
  id: string;
  tripId: string;
  senderId: string;
  senderName: string;
  content: string;
  type: TripMessageType;
  metadata: Record<string, unknown>;
  readBy: string[];
  readAt: string | null;
  createdAt: string;
}

export interface SendTripMessageRequest {
  tripId: string;
  content: string;
  type?: TripMessageType;
  metadata?: Record<string, unknown>;
}

type TripParticipantRow = {
  driver_id?: string | null;
};

type BookingParticipantRow = {
  passenger_id?: string | null;
};

const MESSAGE_SELECT =
  'id, trip_id, sender_id, content, type, metadata, read_by, read_at, created_at, sender:profiles(id, full_name, avatar_url)';

function firstProfile(profile: RawTripMessage['sender']): SenderProfile | null {
  if (Array.isArray(profile)) return profile[0] ?? null;
  return profile ?? null;
}

function normalizeMessage(raw: RawTripMessage): TripMessage {
  const sender = firstProfile(raw.sender) ?? firstProfile(raw.profiles);

  return {
    id: raw.id,
    tripId: raw.trip_id ?? '',
    senderId: raw.sender_id,
    senderName: sender?.full_name?.trim() || 'Driver',
    content: raw.content ?? raw.message ?? '',
    type: raw.type ?? raw.message_type ?? 'text',
    metadata: raw.metadata ?? {},
    readBy: raw.read_by ?? [],
    readAt: raw.read_at ?? null,
    createdAt: raw.created_at ?? new Date().toISOString(),
  };
}

function byCreatedAt(a: TripMessage, b: TripMessage): number {
  return Date.parse(a.createdAt) - Date.parse(b.createdAt);
}

export class MobileChatService {
  private channels = new Map<string, RealtimeChannel>();

  async getMessages(tripId: string, limit = 50): Promise<TripMessage[]> {
    if (!tripId) throw new Error('Missing trip id');

    const { data, error } = await supabase
      .from('messages')
      .select(MESSAGE_SELECT)
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return ((data ?? []) as RawTripMessage[]).map(normalizeMessage).sort(byCreatedAt);
  }

  async sendMessage(request: SendTripMessageRequest): Promise<TripMessage> {
    const content = request.content.trim();
    if (!request.tripId) throw new Error('Missing trip id');
    if (!content) throw new Error('Message is empty');

    const userId = await this.getAuthenticatedUserId();
    await this.assertTripParticipant(request.tripId, userId);

    const { data, error } = await supabase
      .from('messages')
      .insert({
        trip_id: request.tripId,
        sender_id: userId,
        content,
        type: request.type ?? 'text',
        metadata: request.metadata ?? {},
        read_by: [userId],
      })
      .select(MESSAGE_SELECT)
      .single();

    if (error) throw error;

    return normalizeMessage(data as RawTripMessage);
  }

  async markAsRead(messageIds: string[]): Promise<void> {
    const userId = await this.getAuthenticatedUserId();
    const uniqueIds = Array.from(new Set(messageIds)).filter(Boolean);
    if (uniqueIds.length === 0) return;

    const { data, error } = await supabase
      .from('messages')
      .select('id, read_by')
      .in('id', uniqueIds);

    if (error || !data) return;

    const unread = (data as Array<{ id: string; read_by?: string[] | null }>).filter(
      message => !(message.read_by ?? []).includes(userId),
    );

    await Promise.all(
      unread.map(message =>
        supabase
          .from('messages')
          .update({
            read_by: [...(message.read_by ?? []), userId],
            read_at: new Date().toISOString(),
          })
          .eq('id', message.id),
      ),
    );
  }

  subscribeToTrip(
    tripId: string,
    onMessage: (message: TripMessage) => void,
    onError?: (error: Error) => void,
  ): () => void {
    if (!tripId) throw new Error('Missing trip id');

    const channelName = `mobile-trip-messages-${tripId}`;
    const existing = this.channels.get(channelName);
    if (existing) {
      void supabase.removeChannel(existing);
      this.channels.delete(channelName);
    }

    const channel = supabase
      .channel(channelName, {
        config: { broadcast: { self: false } },
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `trip_id=eq.${tripId}`,
        },
        async (payload: { new?: { id?: string } }) => {
          const id = payload.new?.id;
          if (!id) return;

          try {
            const { data, error } = await supabase
              .from('messages')
              .select(MESSAGE_SELECT)
              .eq('id', id)
              .single();

            if (error) throw error;
            if (data) onMessage(normalizeMessage(data as RawTripMessage));
          } catch (error) {
            onError?.(error instanceof Error ? error : new Error('Could not load new message'));
          }
        },
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIPTION_ERROR' || status === 'CHANNEL_ERROR') {
          onError?.(new Error('Live chat connection failed'));
        }
      });

    this.channels.set(channelName, channel);

    return () => {
      void supabase.removeChannel(channel);
      this.channels.delete(channelName);
    };
  }

  private async getAuthenticatedUserId(): Promise<string> {
    const cachedUser = mobileAuth.getUser();
    if (cachedUser?.id) return cachedUser.id;

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) throw error;
    if (!user?.id) throw new Error('User not authenticated');
    return user.id;
  }

  private async assertTripParticipant(tripId: string, userId: string): Promise<void> {
    const [{ data: trip }, { data: booking }] = await Promise.all([
      supabase
        .from('trips')
        .select('driver_id')
        .eq('id', tripId)
        .maybeSingle(),
      supabase
        .from('bookings')
        .select('passenger_id')
        .eq('trip_id', tripId)
        .eq('passenger_id', userId)
        .maybeSingle(),
    ]);

    const tripRow = trip as TripParticipantRow | null;
    const bookingRow = booking as BookingParticipantRow | null;
    const isDriver = tripRow?.driver_id === userId;
    const isPassenger = bookingRow?.passenger_id === userId;

    if (!isDriver && !isPassenger) {
      throw new Error('Not authorized to send messages in this trip');
    }
  }
}

export const chatService = new MobileChatService();

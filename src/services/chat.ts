import { supabase } from '@/utils/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

type MessageReadRow = {
  id: string;
  read_by: string[] | null;
};

export interface Message {
  id: string;
  trip_id: string;
  sender_id: string;
  content: string;
  type: 'text' | 'location' | 'system';
  metadata: Record<string, unknown>;
  read_by: string[];
  created_at: string;
  sender?: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
}

export interface SendMessageRequest {
  tripId: string;
  content: string;
  type?: 'text' | 'location' | 'system';
  metadata?: Record<string, unknown>;
}

class ChatService {
  private channels: Map<string, RealtimeChannel> = new Map();

  async sendMessage(request: SendMessageRequest): Promise<Message> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data: trip } = await supabase
      .from('trips')
      .select('driver_id')
      .eq('id', request.tripId)
      .single();

    const { data: booking } = await supabase
      .from('bookings')
      .select('user_id')
      .eq('trip_id', request.tripId)
      .eq('user_id', user.id)
      .single();

    if (!trip && !booking) {
      throw new Error('Not authorized to send messages in this trip');
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        trip_id: request.tripId,
        sender_id: user.id,
        content: request.content,
        type: request.type || 'text',
        metadata: request.metadata || {},
        read_by: [user.id],
      })
      .select('id, trip_id, sender_id, content, type, metadata, read_by, created_at, sender:profiles(id, full_name, avatar_url)')
      .single();

    if (error) {
      throw error;
    }

    return data as Message;
  }

  async getMessages(tripId: string, limit = 50): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('id, trip_id, sender_id, content, type, metadata, read_by, created_at, sender:profiles(id, full_name, avatar_url)')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return (data as Message[]).reverse();
  }

  async markAsRead(messageIds: string[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    if (messageIds.length === 0) return;

    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, read_by')
      .in('id', messageIds);

    if (error || !messages) return;

    const messageRows = (messages ?? []) as MessageReadRow[];
    const messagesToUpdate = messageRows.filter(
      message => !(message.read_by ?? []).includes(user.id)
    );

    if (messagesToUpdate.length === 0) return;

    const BATCH_SIZE = 10;
    for (let i = 0; i < messagesToUpdate.length; i += BATCH_SIZE) {
      const batch = messagesToUpdate.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map((message) =>
          supabase
            .from('messages')
            .update({
              read_by: [...(message.read_by ?? []), user.id],
            })
            .eq('id', message.id)
        ),
      );
    }
  }

  subscribeToTrip(
    tripId: string,
    onMessage: (message: Message) => void,
    onError?: (error: Error) => void
  ): () => void {
    const channelName = `trip:${tripId}`;

    if (this.channels.has(channelName)) {
      const oldChannel = this.channels.get(channelName);
      if (oldChannel) {
        void oldChannel.unsubscribe();
        this.channels.delete(channelName);
      }
    }

    const channel = supabase
      .channel(channelName, {
        config: { broadcast: { self: false } },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `trip_id=eq.${tripId}`,
        },
        async (payload: { new: { id: string } }) => {
          try {
            const { data } = await supabase
              .from('messages')
              .select('id, trip_id, sender_id, content, type, metadata, read_by, created_at, sender:profiles(id, full_name, avatar_url)')
              .eq('id', payload.new.id)
              .single();

            if (data) {
              onMessage(data as Message);
            }
          } catch (err) {
            console.error('Error fetching new message:', err);
          }
        },
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIPTION_ERROR' && onError) {
          onError(new Error('Subscription failed'));
        }
      });

    this.channels.set(channelName, channel);

    return () => {
      void channel.unsubscribe();
      this.channels.delete(channelName);
    };
  }

  async getUnreadCount(tripId: string): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return 0;
    }

    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('trip_id', tripId)
      .not('read_by', 'cs', `{${user.id}}`);

    return count || 0;
  }
}

export const chatService = new ChatService();

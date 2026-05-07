import { supabase } from '@/utils/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

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
      .select('*, sender:profiles(id, full_name, avatar_url)')
      .single();

    if (error) {
      throw error;
    }

    return data as Message;
  }

  async getMessages(tripId: string, limit = 50): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*, sender:profiles(id, full_name, avatar_url)')
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

    const { data: messages } = await supabase
      .from('messages')
      .select('id, read_by')
      .in('id', messageIds);

    if (!messages) return;

    for (const message of messages) {
      if (!message.read_by.includes(user.id)) {
        await supabase
          .from('messages')
          .update({
            read_by: [...message.read_by, user.id],
          })
          .eq('id', message.id);
      }
    }
  }

  subscribeToTrip(
    tripId: string,
    onMessage: (message: Message) => void,
    onError?: (error: Error) => void
  ): () => void {
    const channelName = `trip:${tripId}`;
    
    if (this.channels.has(channelName)) {
      this.channels.get(channelName)?.unsubscribe();
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `trip_id=eq.${tripId}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from('messages')
            .select('*, sender:profiles(id, full_name, avatar_url)')
            .eq('id', payload.new.id)
            .single();

          if (data) {
            onMessage(data as Message);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIPTION_ERROR' && onError) {
          onError(new Error('Subscription failed'));
        }
      });

    this.channels.set(channelName, channel);

    return () => {
      channel.unsubscribe();
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

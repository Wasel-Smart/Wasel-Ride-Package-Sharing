import { API_URL, fetchWithRetry, getAuthDetails } from './core';

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

async function authHeaders(): Promise<Record<string, string>> {
  const { token } = await getAuthDetails();
  return { Authorization: `Bearer ${token}` };
}

class ChatService {
  async sendMessage(request: SendMessageRequest): Promise<Message> {
    const headers = await authHeaders();
    const response = await fetchWithRetry(`${API_URL}/chat/trips/${encodeURIComponent(request.tripId)}/messages`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      timeout: 10_000,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(String(body.error ?? 'Failed to send message'));
    }

    const body = await response.json();
    return body.message as Message;
  }

  async getMessages(tripId: string, limit = 50): Promise<Message[]> {
    const headers = await authHeaders();
    const response = await fetchWithRetry(
      `${API_URL}/chat/trips/${encodeURIComponent(tripId)}/messages?limit=${limit}`,
      {
        headers,
        timeout: 10_000,
      },
    );

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(String(body.error ?? 'Failed to load messages'));
    }

    const body = await response.json();
    return body.messages as Message[];
  }

  async markAsRead(messageIds: string[]): Promise<void> {
    if (messageIds.length === 0) return;

    const headers = await authHeaders();
    const response = await fetchWithRetry(`${API_URL}/chat/messages/read`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageIds }),
      timeout: 10_000,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(String(body.error ?? 'Failed to mark messages as read'));
    }
  }

  subscribeToTrip(
    tripId: string,
    onMessage: (message: Message) => void,
    onError?: (error: Error) => void,
  ): () => void {
    let active = true;
    let seen = new Set<string>();

    const poll = async () => {
      if (!active) return;

      try {
        const messages = await this.getMessages(tripId);
        const nextSeen = new Set(messages.map(message => message.id));
        for (const message of messages) {
          if (!seen.has(message.id)) {
            onMessage(message);
          }
        }
        seen = nextSeen;
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    };

    void this.getMessages(tripId)
      .then(messages => {
        seen = new Set(messages.map(message => message.id));
      })
      .catch(error => onError?.(error instanceof Error ? error : new Error(String(error))));

    const interval = window.setInterval(() => void poll(), 3000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }

  async getUnreadCount(tripId: string): Promise<number> {
    const headers = await authHeaders();
    const response = await fetchWithRetry(
      `${API_URL}/chat/trips/${encodeURIComponent(tripId)}/unread-count`,
      {
        headers,
        timeout: 10_000,
      },
    );

    if (!response.ok) return 0;
    const body = await response.json();
    return Number(body.count ?? 0);
  }
}

export const chatService = new ChatService();

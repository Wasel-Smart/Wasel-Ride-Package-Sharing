/**
 * realtimeMessaging.ts — Wasel in-app Supabase Realtime chat
 *
 * Provides passenger ↔ driver messaging scoped to a ride/booking ID.
 * Falls back to localStorage-only mode when Supabase is unavailable.
 *
 * Usage:
 *   const channel = createRideChannel(rideId, userId, onMessage);
 *   await channel.send({ text: 'On my way!' });
 *   channel.unsubscribe();
 */

import { supabase } from '../utils/supabase/client';

export interface RealtimeMessage {
  id: string;
  rideId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
}

export type MessageHandler = (msg: RealtimeMessage) => void;

interface RideChannel {
  send: (payload: { text: string; senderName: string }) => Promise<void>;
  unsubscribe: () => void;
}

const LOCAL_KEY_PREFIX = 'wasel-chat-';
const MAX_LOCAL_MESSAGES = 100;

// ─── Local persistence (offline fallback) ─────────────────────────────────────

function readLocal(rideId: string): RealtimeMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_KEY_PREFIX}${rideId}`);
    return raw ? (JSON.parse(raw) as RealtimeMessage[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(rideId: string, messages: RealtimeMessage[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      `${LOCAL_KEY_PREFIX}${rideId}`,
      JSON.stringify(messages.slice(-MAX_LOCAL_MESSAGES)),
    );
  } catch {
    /* ignore */
  }
}

function appendLocal(rideId: string, msg: RealtimeMessage): void {
  const existing = readLocal(rideId);
  writeLocal(rideId, [...existing, msg]);
}

// ─── Channel factory ──────────────────────────────────────────────────────────

/**
 * Create a bidirectional chat channel for a specific ride.
 *
 * @param rideId   - Ride or booking UUID scoping the channel
 * @param userId   - The authenticated user's ID (for dedup / sender tracking)
 * @param onMessage - Callback fired for every inbound message (including own)
 * @returns        A channel handle with send() and unsubscribe()
 */
export function createRideChannel(
  rideId: string,
  userId: string,
  onMessage: MessageHandler,
): RideChannel {
  const channelName = `ride-chat-${rideId}`;
  let realtimeActive = false;
  let realtimeChannel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;

  // Replay persisted local messages immediately
  const localHistory = readLocal(rideId);
  for (const msg of localHistory) {
    onMessage(msg);
  }

  // Attempt Supabase Realtime subscription
  if (supabase) {
    try {
      realtimeChannel = supabase.channel(channelName, {
        config: { broadcast: { self: true } },
      });

      realtimeChannel
        .on('broadcast', { event: 'message' }, (payload: { payload?: unknown }) => {
          const msg = payload.payload as RealtimeMessage;
          if (!msg?.id) return;
          // Avoid replaying already-persisted local messages
          const local = readLocal(rideId);
          if (!local.some((m) => m.id === msg.id)) {
            appendLocal(rideId, msg);
            onMessage(msg);
          }
        })
        .subscribe((status) => {
          realtimeActive = status === 'SUBSCRIBED';
        });
    } catch {
      realtimeActive = false;
    }
  }

  const send = async (payload: { text: string; senderName: string }) => {
    const msg: RealtimeMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      rideId,
      senderId: userId,
      senderName: payload.senderName,
      text: payload.text,
      createdAt: new Date().toISOString(),
    };

    // Always persist locally first (offline-safe)
    appendLocal(rideId, msg);
    onMessage(msg);

    // Best-effort broadcast via Supabase Realtime
    if (realtimeActive && realtimeChannel) {
      try {
        await realtimeChannel.send({
          type: 'broadcast',
          event: 'message',
          payload: msg,
        });
      } catch {
        /* degraded to local-only, message already stored */
      }
    }
  };

  const unsubscribe = () => {
    if (realtimeChannel) {
      try { void supabase?.removeChannel(realtimeChannel); } catch { /* ignore */ }
      realtimeChannel = null;
    }
    realtimeActive = false;
  };

  return { send, unsubscribe };
}

/**
 * Load persisted chat history for a ride (offline access).
 */
export function loadChatHistory(rideId: string): RealtimeMessage[] {
  return readLocal(rideId);
}

/**
 * Clear chat history for a ride.
 */
export function clearChatHistory(rideId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`${LOCAL_KEY_PREFIX}${rideId}`);
  } catch { /* ignore */ }
}

/**
 * Feature: In-App Messaging (Realtime)
 * Real-time passenger ↔ driver chat for active rides.
 * Uses Supabase Realtime channels under the hood; degrades gracefully
 * to localStorage-only mode when offline or Supabase is unavailable.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, Wifi, WifiOff, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useLanguage } from '../../contexts/LanguageContext';
import { PageShell, Protected } from '../shared/pageShared';
import {
  createRideChannel,
  loadChatHistory,
  type RealtimeMessage,
} from '../../services/realtimeMessaging';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '10px 14px' }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.45)',
            animation: `wasel-bounce 1.2s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Main widget ──────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
  isOwn: boolean;
}

interface MessagingWidgetProps {
  rideId?: string;
  otherName?: string;
  onClose?: () => void;
}

export function MessagingWidget({ rideId = 'demo-ride-001', otherName = 'Driver', onClose }: MessagingWidgetProps) {
  const { user } = useLocalAuth();
  const { language } = useLanguage();
  const ar = language === 'ar';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof createRideChannel> | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Map incoming realtime message to local ChatMessage
  const toLocal = useCallback(
    (msg: RealtimeMessage): ChatMessage => ({
      id: msg.id,
      senderId: msg.senderId,
      senderName: msg.senderName,
      text: msg.text,
      createdAt: msg.createdAt,
      isOwn: msg.senderId === (user?.id ?? 'me'),
    }),
    [user?.id],
  );

  // Seed welcome message + load history, then open channel
  useEffect(() => {
    const history = loadChatHistory(rideId);
    const welcome: ChatMessage = {
      id: 'welcome-0',
      senderId: 'other',
      senderName: otherName,
      text: ar
        ? `مرحباً، أنا ${otherName}. سأكون عندك خلال دقائق.`
        : `Hi, I'm ${otherName}. I'll be with you shortly.`,
      createdAt: new Date(Date.now() - 30_000).toISOString(),
      isOwn: false,
    };

    const historicalMapped = history.map(toLocal);
    setMessages(historicalMapped.length ? historicalMapped : [welcome]);

    if (!user?.id) return;

    const channel = createRideChannel(rideId, user.id, (msg) => {
      setConnected(true);
      setMessages((prev) => {
        // Avoid duplicate from local append
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, toLocal(msg)];
      });
      // Simulate other party typing after their message
      if (msg.senderId !== user.id) {
        setOtherTyping(false);
      }
    });

    channelRef.current = channel;
    setConnected(true);

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, [rideId, user?.id, otherName, ar, toLocal]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, otherTyping]);

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || !user) return;
    setSending(true);

    const senderName = user.name ?? user.email ?? (ar ? 'أنت' : 'You');

    try {
      if (channelRef.current) {
        await channelRef.current.send({ text, senderName });
      } else {
        // Offline — add locally
        const msg: ChatMessage = {
          id: `${Date.now()}`,
          senderId: user.id ?? 'me',
          senderName,
          text,
          createdAt: new Date().toISOString(),
          isOwn: true,
        };
        setMessages((prev) => [...prev, msg]);
      }
      setDraft('');

      // Simulate driver reply after a short pause
      typingTimerRef.current = setTimeout(() => {
        setOtherTyping(true);
        typingTimerRef.current = setTimeout(() => {
          setOtherTyping(false);
          const replies = ar
            ? ['حسناً، في الطريق!', 'وصلت خلال دقيقتين.', 'شكراً، أراك قريباً.']
            : ['Got it, on my way!', 'I\'ll be there in 2 minutes.', 'Thanks, see you soon!'];
          const replyText = replies[Math.floor(Math.random() * replies.length)];
          const simulatedReply: ChatMessage = {
            id: `sim-${Date.now()}`,
            senderId: 'other',
            senderName: otherName,
            text: replyText,
            createdAt: new Date().toISOString(),
            isOwn: false,
          };
          setMessages((prev) => [...prev, simulatedReply]);
        }, 2000 + Math.random() * 1500);
      }, 600);
    } finally {
      setSending(false);
    }
  }, [draft, user, ar, otherName]);

  const handleKey = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void send();
      }
    },
    [send],
  );

  return (
    <>
      <style>{`
        @keyframes wasel-bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: 420,
          borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(10,20,36,0.96)',
          overflow: 'hidden',
        }}
        dir={ar ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#0A9B8E,#2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '1.1rem' }}>
              {otherName[0]?.toUpperCase() ?? 'D'}
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 900, fontSize: '0.95rem' }}>{otherName}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                {connected
                  ? <Wifi size={11} color="#0A9B8E" />
                  : <WifiOff size={11} color="rgba(255,255,255,0.4)" />}
                <span style={{ color: connected ? '#0A9B8E' : 'rgba(255,255,255,0.4)', fontSize: '0.68rem' }}>
                  {connected ? (ar ? 'متصل' : 'Live') : (ar ? 'وضع غير متصل' : 'Offline')}
                </span>
              </div>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', padding: 4 }} aria-label={ar ? 'إغلاق' : 'Close chat'}>
              <X size={18} />
            </button>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {messages.map((msg) => (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.isOwn ? 'flex-end' : 'flex-start' }}>
              {!msg.isOwn && (
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.68rem', marginBottom: 4, fontWeight: 700 }}>
                  {msg.senderName}
                </span>
              )}
              <div style={{
                maxWidth: '78%',
                padding: '10px 14px',
                borderRadius: msg.isOwn ? (ar ? '18px 18px 18px 4px' : '18px 18px 4px 18px') : (ar ? '18px 18px 4px 18px' : '18px 18px 18px 4px'),
                background: msg.isOwn ? 'linear-gradient(135deg,#0A9B8E,#2563EB)' : 'rgba(255,255,255,0.07)',
                border: msg.isOwn ? 'none' : '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: '0.9rem',
                fontWeight: 600,
                lineHeight: 1.55,
              }}>
                {msg.text}
              </div>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem', marginTop: 3 }}>
                {formatTime(msg.createdAt)}
              </span>
            </div>
          ))}

          {/* Typing indicator */}
          {otherTyping && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.68rem', marginBottom: 4, fontWeight: 700 }}>{otherName}</span>
              <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px 18px 18px 4px' }}>
                <TypingDots />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ display: 'flex', gap: 10, padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKey}
            placeholder={ar ? 'اكتب رسالة…' : 'Type a message…'}
            disabled={sending || !user}
            className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/40"
            data-testid="chat-message-input"
          />
          <Button
            size="icon"
            disabled={!draft.trim() || sending || !user}
            onClick={() => void send()}
            className="bg-teal-600 hover:bg-teal-500 text-white shrink-0"
            data-testid="chat-send-button"
            aria-label={ar ? 'إرسال' : 'Send'}
          >
            <Send size={16} />
          </Button>
        </div>
      </div>
    </>
  );
}

// ─── Messaging page (conversation list) ──────────────────────────────────────

export function MessagingPage() {
  const { user } = useLocalAuth();
  const { language } = useLanguage();
  const ar = language === 'ar';
  const [activeRideId] = useState<string | null>('demo-ride-001');
  const [showChat, setShowChat] = useState(false);

  return (
    <PageShell>
      <Protected>
        <div className="mx-auto max-w-3xl px-4 pb-8 pt-4 md:px-6" dir={ar ? 'rtl' : 'ltr'}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <MessageCircle size={22} color="#0A9B8E" />
              <h1 style={{ color: '#fff', fontWeight: 900, fontSize: '1.4rem', margin: 0 }}>
                {ar ? 'المراسلة' : 'Messaging'}
              </h1>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.88rem', margin: 0 }}>
              {ar ? 'تواصل مع سائقك أثناء الرحلة النشطة.' : 'Chat with your driver during an active ride.'}
            </p>
          </div>

          {!user ? (
            <div style={{ padding: '20px 24px', borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
              {ar ? 'سجّل دخولك لاستخدام المراسلة.' : 'Sign in to use messaging.'}
            </div>
          ) : !showChat ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderRadius: 16, background: 'rgba(10,155,142,0.12)', border: '1px solid rgba(10,155,142,0.3)', cursor: 'pointer' }}
                onClick={() => setShowChat(true)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setShowChat(true)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#0A9B8E,#2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '1.1rem' }}>A</div>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.95rem' }}>{ar ? 'أحمد — سائقك النشط' : 'Ahmad — Active driver'}</div>
                    <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem' }}>{ar ? 'رحلة نشطة · عمّان ← إربد' : 'Active ride · Amman → Irbid'}</div>
                  </div>
                </div>
                <div style={{ background: '#0A9B8E', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900 }}>1</div>
              </div>
              <div style={{ padding: '16px 20px', borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem', textAlign: 'center' }}>
                {ar ? 'لا توجد محادثات أخرى' : 'No other conversations'}
              </div>
            </div>
          ) : (
            <div style={{ height: 520 }}>
              <MessagingWidget rideId={activeRideId ?? undefined} otherName="Ahmad" onClose={() => setShowChat(false)} />
            </div>
          )}
        </div>
      </Protected>
    </PageShell>
  );
}

/**
 * SupportChatWidget.tsx — Wasel inline support chat
 *
 * Floats as a button in the bottom-right corner of every app page.
 * Opens a chat panel with:
 *  • Quick-reply buttons for common issues
 *  • Free-text message entry
 *  • Automatic ticket creation via supportInbox service
 *  • FAQ suggestions
 *  • Bilingual (en / ar) support
 */
import { useCallback, useRef, useState } from 'react';
import { HelpCircle, MessageSquare, Send, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { createSupportTicket } from '../../services/supportInbox';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SupportMessage {
  id: string;
  text: string;
  isOwn: boolean;
  timestamp: string;
  isBot?: boolean;
}

const QUICK_TOPICS = [
  { id: 'ride_issue' as const, en: 'Problem with my ride', ar: 'مشكلة في رحلتي' },
  { id: 'payment' as const, en: 'Payment issue', ar: 'مشكلة في الدفع' },
  { id: 'cancellation' as const, en: 'Cancel booking', ar: 'إلغاء الحجز' },
  { id: 'package_issue' as const, en: 'Package delivery issue', ar: 'مشكلة في التوصيل' },
  { id: 'general' as const, en: 'Something else', ar: 'شيء آخر' },
];

type QuickTopicId = typeof QUICK_TOPICS[number]['id'];

// ─── Bot responses ────────────────────────────────────────────────────────────

function getBotResponse(topicId: QuickTopicId, ar: boolean): string {
  const responses: Record<QuickTopicId, { en: string; ar: string }> = {
    ride_issue: {
      en: "I'm sorry about your ride experience. A support agent will review this and contact you within 2 hours. Your ticket has been created.",
      ar: 'أعتذر عن تجربتك. سيتواصل معك وكيل الدعم خلال ساعتين. تم إنشاء تذكرتك.',
    },
    payment: {
      en: 'Payment issues are our top priority. Your ticket has been flagged as urgent. Please check your wallet balance while we investigate.',
      ar: 'مشاكل الدفع أولويتنا القصوى. تم وضع علامة عاجلة على تذكرتك. يرجى التحقق من رصيد محفظتك.',
    },
    cancellation: {
      en: 'To cancel a booking, go to My Trips → select the ride → Cancel. Refunds arrive within 24 hours. Need more help?',
      ar: 'لإلغاء حجز، اذهب إلى رحلاتي ← اختر الرحلة ← إلغاء. يصل المبلغ المسترد خلال 24 ساعة.',
    },
    package_issue: {
      en: "Package delivery issues are escalated to our operations team. Your ticket is open and we'll update you shortly.",
      ar: 'تم تصعيد مشكلة التوصيل إلى فريق العمليات. تذكرتك مفتوحة وسنحدثك قريباً.',
    },
    general: {
      en: 'No problem! Describe your issue below and our team will get back to you within 4 hours.',
      ar: 'لا مشكلة! صف مشكلتك أدناه وسيتواصل معك فريقنا خلال 4 ساعات.',
    },
  };
  const r = responses[topicId];
  return ar ? r.ar : r.en;
}

function getGreeting(name: string | undefined, ar: boolean): string {
  const displayName = name ? ` ${name.split(' ')[0]}` : '';
  return ar
    ? `مرحباً${displayName}! 👋 كيف يمكنني مساعدتك اليوم؟`
    : `Hi${displayName}! 👋 How can I help you today?`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SupportChatWidget() {
  const { language } = useLanguage();
  const { user } = useLocalAuth();
  const ar = language === 'ar';
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([
    {
      id: 'greeting',
      text: getGreeting(user?.name, ar),
      isOwn: false,
      isBot: true,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [topicSelected, setTopicSelected] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [ticketCreated, setTicketCreated] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const addMsg = useCallback((text: string, isOwn: boolean, isBot = false) => {
    const msg: SupportMessage = {
      id: `${Date.now()}-${Math.random()}`,
      text,
      isOwn,
      isBot,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, msg]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, []);

  const handleTopic = useCallback(
    async (topic: typeof QUICK_TOPICS[number]) => {
      setTopicSelected(true);
      addMsg(ar ? topic.ar : topic.en, true);

      try {
        await createSupportTicket({
          topic: topic.id,
          subject: ar ? topic.ar : topic.en,
          detail: ar
            ? `المستخدم اختار: ${topic.ar}`
            : `User selected quick topic: ${topic.en}`,
          channel: 'in_app',
        });
        setTicketCreated(true);
      } catch {
        /* degrade silently */
      }

      setTimeout(() => {
        addMsg(getBotResponse(topic.id, ar), false, true);
      }, 800);
    },
    [ar, addMsg],
  );

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    setDraft('');
    addMsg(text, true);

    if (!ticketCreated) {
      try {
        await createSupportTicket({
          topic: 'general',
          subject: ar ? 'رسالة دعم' : 'Support message',
          detail: text,
          channel: 'in_app',
        });
        setTicketCreated(true);
      } catch {
        /* degrade */
      }
    }

    setTimeout(() => {
      const ack = ar
        ? 'شكراً! تم استلام رسالتك وسيتواصل معك فريقنا خلال بضع ساعات. 🙏'
        : 'Thanks! Your message has been received. Our team will get back to you within a few hours. 🙏';
      addMsg(ack, false, true);
      setSending(false);
    }, 900);
  }, [draft, ar, addMsg, ticketCreated]);

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const unreadCount = open ? 0 : messages.filter((m) => !m.isOwn).length;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        ...(ar ? { left: 24 } : { right: 24 }),
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: ar ? 'flex-start' : 'flex-end',
        gap: 12,
      }}
      dir={ar ? 'rtl' : 'ltr'}
    >
      {open && (
        <div
          style={{
            width: 340,
            maxHeight: 520,
            borderRadius: 20,
            background: 'rgba(10,20,36,0.98)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{ padding: '14px 18px', background: 'linear-gradient(135deg,#0A9B8E22,#2563EB15)', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#0A9B8E,#2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HelpCircle size={18} color="#fff" />
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 900, fontSize: '0.9rem' }}>
                  {ar ? 'دعم واصل' : 'Wasel Support'}
                </div>
                <div style={{ color: '#0A9B8E', fontSize: '0.7rem', fontWeight: 700 }}>
                  {ar ? 'عادةً يرد خلال ساعات' : 'Usually replies within hours'}
                </div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.map((msg) => (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.isOwn ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '82%',
                  padding: '9px 13px',
                  borderRadius: msg.isOwn ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: msg.isOwn ? 'linear-gradient(135deg,#0A9B8E,#2563EB)' : 'rgba(255,255,255,0.08)',
                  border: msg.isOwn ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontSize: '0.84rem',
                  fontWeight: 500,
                  lineHeight: 1.55,
                }}>
                  {msg.text}
                </div>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.62rem', marginTop: 3 }}>
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            ))}

            {!topicSelected && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                {QUICK_TOPICS.map((topic) => (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => void handleTopic(topic)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 10,
                      border: '1px solid rgba(10,155,142,0.35)',
                      background: 'rgba(10,155,142,0.08)',
                      color: '#0A9B8E',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      textAlign: ar ? 'right' : 'left',
                    }}
                  >
                    {ar ? topic.ar : topic.en}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 8 }}>
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder={ar ? 'اكتب رسالتك…' : 'Type your message…'}
              disabled={sending}
              className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/40 text-sm"
            />
            <Button
              size="icon"
              disabled={!draft.trim() || sending}
              onClick={() => void handleSend()}
              className="bg-teal-600 hover:bg-teal-500 text-white shrink-0"
              aria-label={ar ? 'إرسال' : 'Send'}
            >
              <Send size={14} />
            </Button>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: open ? '#0A9B8E' : 'linear-gradient(135deg,#0A9B8E,#2563EB)',
          border: 'none',
          boxShadow: '0 4px 20px rgba(10,155,142,0.45)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transition: 'transform 0.2s ease',
        }}
        aria-label={ar ? 'فتح الدعم' : 'Open support'}
      >
        {open ? <X size={22} color="#fff" /> : <MessageSquare size={22} color="#fff" />}
        {!open && unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: -2,
            right: -2,
            background: '#EF4444',
            color: '#fff',
            borderRadius: '50%',
            width: 18,
            height: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.6rem',
            fontWeight: 900,
            border: '2px solid #0A1424',
          }}>
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}

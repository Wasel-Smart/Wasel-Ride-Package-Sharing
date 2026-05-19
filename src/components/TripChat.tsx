import { useState, useEffect, useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { chatService, Message } from '@/services/chat';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';

interface TripChatProps {
  tripId: string;
  onClose?: () => void;
}

export function TripChat({ tripId, onClose }: TripChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMessages();
    const unsubscribe = chatService.subscribeToTrip(tripId, message => {
      setMessages(prev => [...prev, message]);
      if (message.sender_id !== user?.id) {
        chatService.markAsRead([message.id]);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [tripId, user?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      const data = await chatService.getMessages(tripId);
      setMessages(data);

      const unreadIds = data
        .filter(m => m.sender_id !== user?.id && !m.read_by.includes(user?.id || ''))
        .map(m => m.id);

      if (unreadIds.length > 0) {
        await chatService.markAsRead(unreadIds);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      await chatService.sendMessage({
        tripId,
        content: newMessage.trim(),
      });
      setNewMessage('');
      inputRef.current?.focus();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <Card className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin" size={32} />
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[600px] max-h-[80vh]">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">Trip Chat</h3>
        {onClose && (
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map(message => {
            const isOwn = message.sender_id === user?.id;
            return (
              <div key={message.id} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
                <Avatar className="w-8 h-8 flex-shrink-0">
                  {message.sender?.avatar_url ? (
                    <img src={message.sender.avatar_url} alt={message.sender.full_name} />
                  ) : (
                    <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white text-sm">
                      {message.sender?.full_name?.[0] || '?'}
                    </div>
                  )}
                </Avatar>
                <div className={`flex-1 ${isOwn ? 'text-right' : ''}`}>
                  <div
                    className={`inline-block px-4 py-2 rounded-lg max-w-[70%] ${
                      isOwn ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {message.content}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(message.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={sending}
          />
          <Button onClick={handleSend} disabled={!newMessage.trim() || sending} className="px-4">
            {sending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
          </Button>
        </div>
      </div>
    </Card>
  );
}

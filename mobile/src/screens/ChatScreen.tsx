import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import {
  ScreenShell,
  StateNotice,
  StatusPill,
} from '../components/MobilePrimitives';
import type { RootStackParamList } from '../navigation/types';
import { useAuth } from '../providers/AuthProvider';
import { chatService, type TripMessage } from '../services/chat';
import { colors, hitSlop, radii, shadows, spacing, typography } from '../theme';

type ChatRouteParams = RootStackParamList['Chat'];

type ChatScreenProps = {
  route?: {
    params?: ChatRouteParams;
  };
};

const QUICK_REPLIES = [
  { id: '1', text: 'بالطريق!', icon: 'walk' as const },
  { id: '2', text: 'استنى دقيقتين لو سمحت', icon: 'time' as const },
  { id: '3', text: 'شارك الموقع', icon: 'location' as const },
  { id: '4', text: 'شكراً!', icon: 'heart' as const },
];

function upsertMessage(next: TripMessage) {
  return (prev: TripMessage[]) => {
    const existingIndex = prev.findIndex(message => message.id === next.id);
    const merged =
      existingIndex >= 0
        ? prev.map(message => (message.id === next.id ? next : message))
        : [...prev, next];

    return merged.sort(
      (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
    );
  };
}

const ChatScreen = React.memo(function ChatScreen({ route }: ChatScreenProps) {
  const { user, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<TripMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const tripId = route?.params?.tripId ?? route?.params?.rideId ?? '';
  const driverName = route?.params?.driverName?.trim() || 'السائق';
  const currentUserId = user?.id ?? '';
  const otherPartyName = driverName.includes('السائق') ? driverName : `${driverName} (السائق)`;
  const otherPartyInitial = driverName.slice(0, 1).toUpperCase() || 'D';

  useEffect(() => {
    if (authLoading) return undefined;

    let mounted = true;
    let unsubscribe: (() => void) | undefined;

    async function loadThread() {
      if (!currentUserId) {
        setLoading(false);
        setError('سجّل دخولك لمراسلة السائق.');
        setMessages([]);
        return;
      }

      if (!tripId) {
        setLoading(false);
        setError('دردشة المشوار غير متاحة بدون مشوار نشط.');
        setMessages([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const loadedMessages = await chatService.getMessages(tripId);
        if (!mounted) return;

        setMessages(loadedMessages);

        const unreadIds = loadedMessages
          .filter(
            message => message.senderId !== currentUserId && !message.readBy.includes(currentUserId),
          )
          .map(message => message.id);
        if (unreadIds.length > 0) {
          void chatService.markAsRead(unreadIds).catch(() => undefined);
        }

        unsubscribe = chatService.subscribeToTrip(
          tripId,
          message => {
            setMessages(upsertMessage(message));
            if (message.senderId !== currentUserId && !message.readBy.includes(currentUserId)) {
              void chatService.markAsRead([message.id]).catch(() => undefined);
            }
          },
          liveError => {
            setError(liveError.message || 'فشل اتصال الدردشة المباشرة.');
          },
        );
      } catch (loadError) {
        if (!mounted) return;
        setMessages([]);
        setError(loadError instanceof Error ? loadError.message : 'ما قدرنا نحمّل الرسائل.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadThread();

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [authLoading, currentUserId, tripId]);

  // Auto-scroll to bottom
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending || !tripId || !currentUserId) return;

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSending(true);
      setError(null);

      try {
        const sent = await chatService.sendMessage({
          tripId,
          content: trimmed,
        });
        setMessages(upsertMessage(sent));
        setInputText('');
      } catch (sendError) {
        setError(sendError instanceof Error ? sendError.message : 'ما قدرنا نرسل الرسالة.');
      } finally {
        setSending(false);
      }
    },
    [currentUserId, sending, tripId],
  );

  const handleQuickReply = useCallback(
    (text: string) => {
      void sendMessage(text);
    },
    [sendMessage],
  );

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleTimeString('ar-JO', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const renderMessage = (message: TripMessage, index: number) => {
    const isOwn = message.senderId === currentUserId;
    const isSystem = message.type === 'system';
    const readByOtherParty = message.readBy.some(readerId => readerId !== message.senderId);
    const showAvatar =
      index === messages.length - 1 ||
      messages[index + 1]?.senderId !== message.senderId;

    if (isSystem) {
      return (
        <View key={message.id} style={styles.systemMessageContainer}>
          <View style={styles.systemMessage}>
            <Text style={styles.systemMessageText}>{message.content}</Text>
          </View>
          <Text style={styles.systemMessageTime}>{formatTime(message.createdAt)}</Text>
        </View>
      );
    }

    return (
      <View
        key={message.id}
        style={[
          styles.messageRow,
          isOwn ? styles.messageRowOwn : styles.messageRowOther,
        ]}
      >
        {!isOwn && showAvatar && (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(message.senderName || driverName).slice(0, 1)}
            </Text>
          </View>
        )}
        {!isOwn && !showAvatar && <View style={styles.avatarPlaceholder} />}

        <View
          style={[
            styles.messageBubble,
            isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isOwn ? styles.messageTextOwn : styles.messageTextOther,
            ]}
          >
            {message.content}
          </Text>
          <View style={styles.messageFooter}>
            <Text
              style={[
                styles.messageTime,
                isOwn ? styles.messageTimeOwn : styles.messageTimeOther,
              ]}
            >
              {formatTime(message.createdAt)}
            </Text>
            {isOwn && (
              <Ionicons
                name={readByOtherParty || message.readAt ? 'checkmark-done' : 'checkmark'}
                size={14}
                color={readByOtherParty || message.readAt ? colors.blue : '#FFFFFF99'}
              />
            )}
          </View>
        </View>

        {isOwn && <View style={styles.avatarPlaceholder} />}
      </View>
    );
  };

  return (
    <ScreenShell testID="chat-screen">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={90}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>{otherPartyInitial}</Text>
            </View>
            <View>
              <Text style={styles.headerName}>{otherPartyName}</Text>
              <View style={styles.headerStatus}>
                <View style={[styles.onlineDot, error ? styles.offlineDot : null]} />
                <Text style={[styles.headerStatusText, error ? styles.headerStatusTextMuted : null]}>
                  {error ? 'مشكلة اتصال' : 'دردشة مباشرة'}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.headerActions}>
            <StatusPill label="المشوار نشط" tone={colors.green} icon="car" />
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.dateHeader}>
            <Text style={styles.dateHeaderText}>اليوم</Text>
          </View>

          {loading ? (
            <StateNotice
              icon="chatbubbles"
              title="جاري تحميل الرسائل"
              body="بنفتح دردشة المشوار المباشرة."
              loading
              tone={colors.blue}
              testID="chat-loading-state"
            />
          ) : error ? (
            <StateNotice
              icon="warning"
              title="الدردشة غير متاحة"
              body={error}
              tone={colors.amber}
              testID="chat-error-state"
            />
          ) : messages.length === 0 ? (
            <StateNotice
              icon="chatbubble-ellipses"
              title="لسه ما في رسائل"
              body="أرسل أول تحديث لما تحتاج السائق."
              tone={colors.muted}
              testID="chat-empty-state"
            />
          ) : (
            messages.map((msg, idx) => renderMessage(msg, idx))
          )}
        </ScrollView>

        {/* Quick Replies */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickReplies}
          contentContainerStyle={styles.quickRepliesContent}
        >
          {QUICK_REPLIES.map(reply => (
            <Pressable
              key={reply.id}
              style={styles.quickReply}
              onPress={() => handleQuickReply(reply.text)}
              disabled={loading || sending || Boolean(error)}
              hitSlop={hitSlop}
            >
              <Ionicons name={reply.icon} size={16} color={colors.teal} />
              <Text style={styles.quickReplyText}>{reply.text}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <Pressable style={styles.inputAction} hitSlop={hitSlop}>
            <Ionicons name="image" size={22} color={colors.muted} />
          </Pressable>

          <TextInput
            style={styles.input}
            placeholder="اكتب رسالة..."
            placeholderTextColor={colors.muted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!loading && !sending && !error}
            testID="chat-input"
          />

          <Pressable
            style={[
              styles.sendButton,
              inputText.trim() ? styles.sendButtonActive : null,
            ]}
            onPress={() => void sendMessage(inputText)}
            disabled={!inputText.trim() || loading || sending || Boolean(error)}
            hitSlop={hitSlop}
            testID="chat-send-button"
          >
            <Ionicons
              name={sending ? 'time' : 'send'}
              size={20}
              color={inputText.trim() && !error ? '#FFFFFF' : colors.muted}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    ...shadows.card,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  headerName: {
    color: colors.ink,
    ...typography.body,
    fontWeight: '900',
  },
  headerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.green,
  },
  offlineDot: {
    backgroundColor: colors.amber,
  },
  headerStatusText: {
    color: colors.green,
    fontSize: 12,
    fontWeight: '700',
  },
  headerStatusTextMuted: {
    color: colors.amber,
  },
  headerActions: {
    marginLeft: spacing.sm,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  messagesContent: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  dateHeader: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dateHeaderText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  messageRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  messageRowOwn: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  avatarPlaceholder: {
    width: 32,
  },
  messageBubble: {
    maxWidth: '70%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    gap: 4,
  },
  messageBubbleOwn: {
    backgroundColor: colors.teal,
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
    ...shadows.card,
  },
  messageText: {
    ...typography.body,
    lineHeight: 20,
  },
  messageTextOwn: {
    color: '#FFFFFF',
  },
  messageTextOther: {
    color: colors.ink,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'flex-end',
  },
  messageTime: {
    fontSize: 11,
    fontWeight: '700',
  },
  messageTimeOwn: {
    color: '#FFFFFF99',
  },
  messageTimeOther: {
    color: colors.muted,
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  systemMessage: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
  },
  systemMessageText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  systemMessageTime: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 4,
  },
  typingIndicator: {
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.muted,
  },
  typingDot1: {
    opacity: 0.4,
  },
  typingDot2: {
    opacity: 0.6,
  },
  typingDot3: {
    opacity: 0.8,
  },
  quickReplies: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  quickRepliesContent: {
    padding: spacing.sm,
    gap: spacing.sm,
  },
  quickReply: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
  },
  quickReplyText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  inputAction: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.ink,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: {
    backgroundColor: colors.teal,
  },
});

export default ChatScreen;


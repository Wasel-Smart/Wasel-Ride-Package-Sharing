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
  StatusPill,
} from '../components/MobilePrimitives';
import { useAuth } from '../providers/AuthProvider';
import { colors, hitSlop, radii, shadows, spacing, typography } from '../theme';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  delivered: boolean;
  read: boolean;
  type: 'text' | 'location' | 'system';
}

const MOCK_MESSAGES: Message[] = [
  {
    id: '1',
    senderId: 'driver-123',
    senderName: 'Ahmad',
    text: 'Hello! I am on my way to pick you up',
    timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    delivered: true,
    read: true,
    type: 'text',
  },
  {
    id: '2',
    senderId: 'system',
    senderName: 'System',
    text: 'Driver is 5 minutes away',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    delivered: true,
    read: true,
    type: 'system',
  },
  {
    id: '3',
    senderId: 'user-456',
    senderName: 'You',
    text: 'Great! I am ready',
    timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    delivered: true,
    read: true,
    type: 'text',
  },
  {
    id: '4',
    senderId: 'driver-123',
    senderName: 'Ahmad',
    text: 'I can see you. White Toyota near the cafe?',
    timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    delivered: true,
    read: false,
    type: 'text',
  },
];

const QUICK_REPLIES = [
  { id: '1', text: 'On my way!', icon: 'walk' as const },
  { id: '2', text: 'Please wait 2 min', icon: 'time' as const },
  { id: '3', text: 'Share location', icon: 'location' as const },
  { id: '4', text: 'Thank you!', icon: 'heart' as const },
];

const ChatScreen = React.memo(function ChatScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const currentUserId = user?.id || 'user-456';
  const otherPartyName = 'Ahmad (Driver)';

  // Simulate typing indicator
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (Math.random() > 0.7) {
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 3000);
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return;

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const newMessage: Message = {
        id: Date.now().toString(),
        senderId: currentUserId,
        senderName: 'You',
        text: text.trim(),
        timestamp: new Date().toISOString(),
        delivered: false,
        read: false,
        type: 'text',
      };

      setMessages(prev => [...prev, newMessage]);
      setInputText('');

      // Simulate delivery
      setTimeout(() => {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === newMessage.id ? { ...msg, delivered: true } : msg,
          ),
        );
      }, 1000);
    },
    [currentUserId],
  );

  const handleQuickReply = useCallback(
    (text: string) => {
      sendMessage(text);
    },
    [sendMessage],
  );

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const renderMessage = (message: Message, index: number) => {
    const isOwn = message.senderId === currentUserId;
    const isSystem = message.type === 'system';
    const showAvatar =
      index === messages.length - 1 ||
      messages[index + 1]?.senderId !== message.senderId;

    if (isSystem) {
      return (
        <View key={message.id} style={styles.systemMessageContainer}>
          <View style={styles.systemMessage}>
            <Text style={styles.systemMessageText}>{message.text}</Text>
          </View>
          <Text style={styles.systemMessageTime}>{formatTime(message.timestamp)}</Text>
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
              {message.senderName.slice(0, 1)}
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
            {message.text}
          </Text>
          <View style={styles.messageFooter}>
            <Text
              style={[
                styles.messageTime,
                isOwn ? styles.messageTimeOwn : styles.messageTimeOther,
              ]}
            >
              {formatTime(message.timestamp)}
            </Text>
            {isOwn && (
              <Ionicons
                name={message.read ? 'checkmark-done' : message.delivered ? 'checkmark' : 'time'}
                size={14}
                color={message.read ? colors.blue : '#FFFFFF99'}
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
              <Text style={styles.headerAvatarText}>A</Text>
            </View>
            <View>
              <Text style={styles.headerName}>{otherPartyName}</Text>
              <View style={styles.headerStatus}>
                <View style={styles.onlineDot} />
                <Text style={styles.headerStatusText}>Online</Text>
              </View>
            </View>
          </View>
          <View style={styles.headerActions}>
            <StatusPill label="Trip active" tone={colors.green} icon="car" />
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
            <Text style={styles.dateHeaderText}>Today</Text>
          </View>

          {messages.map((msg, idx) => renderMessage(msg, idx))}

          {isTyping && (
            <View style={[styles.messageRow, styles.messageRowOther]}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>A</Text>
              </View>
              <View style={[styles.messageBubble, styles.messageBubbleOther]}>
                <View style={styles.typingIndicator}>
                  <View style={[styles.typingDot, styles.typingDot1]} />
                  <View style={[styles.typingDot, styles.typingDot2]} />
                  <View style={[styles.typingDot, styles.typingDot3]} />
                </View>
              </View>
            </View>
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
            placeholder="Type a message..."
            placeholderTextColor={colors.muted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />

          <Pressable
            style={[
              styles.sendButton,
              inputText.trim() ? styles.sendButtonActive : null,
            ]}
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim()}
            hitSlop={hitSlop}
          >
            <Ionicons
              name="send"
              size={20}
              color={inputText.trim() ? '#FFFFFF' : colors.muted}
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
    fontSize: typography.body,
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
  headerStatusText: {
    color: colors.green,
    fontSize: 12,
    fontWeight: '700',
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
    fontSize: typography.body,
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
    fontSize: typography.body,
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

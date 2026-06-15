import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../providers/AuthProvider';
import { colors, radii, spacing, typography } from '../theme';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
  isOwn: boolean;
}

interface ChatThreadProps {
  rideId: string;
  driverId: string;
  driverName: string;
  onClose: () => void;
}

export const ChatThread = React.memo(function ChatThread({
  rideId,
  driverId,
  driverName,
  onClose,
}: ChatThreadProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Seed a welcome message
  useEffect(() => {
    setMessages([
      {
        id: '0',
        senderId: driverId,
        senderName: driverName,
        text: 'Hi, I am your driver. I will be there in a few minutes.',
        createdAt: new Date().toISOString(),
        isOwn: false,
      },
    ]);
  }, [driverId, driverName]);

  const sendMessage = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || !user) return;
    setSending(true);
    const msg: Message = {
      id: Date.now().toString(),
      senderId: user.id,
      senderName: user.email ?? 'You',
      text: trimmed,
      createdAt: new Date().toISOString(),
      isOwn: true,
    };
    setMessages(prev => [...prev, msg]);
    setText('');
    setSending(false);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, [text, user]);

  const renderItem = useCallback(({ item }: { item: Message }) => (
    <View style={[styles.bubble, item.isOwn ? styles.ownBubble : styles.otherBubble]}>
      {!item.isOwn && (
        <Text style={styles.senderName}>{item.senderName}</Text>
      )}
      <Text style={[styles.bubbleText, item.isOwn ? styles.ownText : styles.otherText]}>
        {item.text}
      </Text>
      <Text style={styles.timestamp}>
        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  ), []);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{driverName[0]?.toUpperCase() ?? 'D'}</Text>
          </View>
          <View>
            <Text style={styles.headerName}>{driverName}</Text>
            <Text style={styles.headerSub}>Ride #{rideId.slice(-6)}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close chat">
          <Ionicons name="close" size={22} color={colors.ink} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message…"
          placeholderTextColor={colors.muted}
          returnKeyType="send"
          onSubmitEditing={() => void sendMessage()}
          editable={!sending}
          testID="chat-input"
        />
        <TouchableOpacity
          style={[styles.sendBtn, { opacity: text.trim() ? 1 : 0.4 }]}
          onPress={() => void sendMessage()}
          disabled={!text.trim() || sending}
          accessibilityLabel="Send message"
          testID="send-message-button"
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerInfo: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.teal,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  headerName: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  headerSub: { color: colors.muted, fontSize: typography.caption },
  closeBtn: { padding: spacing.xs },
  messagesList: { gap: spacing.sm, padding: spacing.lg },
  bubble: {
    maxWidth: '78%',
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  ownBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.teal,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
    borderColor: colors.line,
    borderWidth: StyleSheet.hairlineWidth,
  },
  senderName: { color: colors.muted, fontSize: typography.caption, fontWeight: '800', marginBottom: 3 },
  bubbleText: { fontSize: typography.body, lineHeight: 22 },
  ownText: { color: '#fff', fontWeight: '700' },
  otherText: { color: colors.ink, fontWeight: '700' },
  timestamp: { color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 4, textAlign: 'right' },
  inputBar: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderTopColor: colors.line,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    color: colors.ink,
    flex: 1,
    fontSize: typography.body,
    fontWeight: '700',
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  sendBtn: {
    alignItems: 'center',
    backgroundColor: colors.teal,
    borderRadius: radii.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
});

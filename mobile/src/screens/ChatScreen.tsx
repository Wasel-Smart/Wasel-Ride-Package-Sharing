import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, type RouteProp } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { useHaptics } from '../hooks/useHaptics';
import { supabase } from '../lib/supabase';
import { C, S, R, T } from '../theme';

interface Message {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
  sender: {
    full_name: string;
  };
}

type ChatRoute = RouteProp<{ Chat: { tripId: string; otherUserId: string; otherUserName: string } }, 'Chat'>;

export default function ChatScreen() {
  const route = useRoute<ChatRoute>();
  const nav = useNavigation();
  const { user } = useAuth();
  const { light } = useHaptics();

  const { tripId, otherUserId, otherUserName } = route.params;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    void loadMessages();
    const subscription = subscribeToMessages();
    return () => { subscription?.unsubscribe(); };
  }, [tripId]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          id, sender_id, message, created_at,
          profiles!sender_id (full_name)
        `)
        .eq('trip_id', tripId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []) as any);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    return supabase
      .channel(`chat:${tripId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `trip_id=eq.${tripId}`,
      }, (payload) => {
        const newMessage = payload.new as Message;
        setMessages(prev => [...prev, newMessage]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      })
      .subscribe();
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    light();
    const messageText = inputText.trim();
    setInputText('');

    try {
      const { error } = await supabase.from('chat_messages').insert({
        trip_id: tripId,
        sender_id: user!.id,
        receiver_id: otherUserId,
        message: messageText,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;
    } catch (err) {
      console.error('Failed to send message:', err);
      setInputText(messageText); // Restore on error
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.sender_id === user?.id;

    return (
      <View style={[styles.messageRow, isMe && styles.messageRowMe]}>
        <View style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleOther]}>
          {!isMe && <Text style={styles.senderName}>{item.sender.full_name}</Text>}
          <Text style={[styles.messageText, isMe && styles.messageTextMe]}>{item.message}</Text>
          <Text style={[styles.messageTime, isMe && styles.messageTimeMe]}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => { light(); nav.goBack(); }}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{otherUserName}</Text>
          <Text style={styles.headerSub}>Trip chat</Text>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor={C.muted}
            multiline
            maxLength={500}
            selectionColor={C.cyan}
            accessibilityLabel="Message input"
          />
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim()}
            accessibilityLabel="Send message"
            accessibilityRole="button"
          >
            <Ionicons name="send" size={20} color={inputText.trim() ? '#fff' : C.muted} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, paddingVertical: S.md, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn: { width: 40, height: 40, borderRadius: R.md, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  headerSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  messagesList: { paddingHorizontal: S.lg, paddingVertical: S.md, gap: S.sm },
  messageRow: { flexDirection: 'row', marginBottom: S.sm },
  messageRowMe: { justifyContent: 'flex-end' },
  messageBubble: { maxWidth: '75%', borderRadius: R.md, padding: S.md },
  messageBubbleOther: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  messageBubbleMe: { backgroundColor: C.cyan },
  senderName: { fontSize: 11, fontWeight: '700', color: C.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  messageText: { fontSize: 14, color: C.text, lineHeight: 20 },
  messageTextMe: { color: '#fff' },
  messageTime: { fontSize: 10, color: C.muted, marginTop: 4, textAlign: 'right' },
  messageTimeMe: { color: 'rgba(255,255,255,0.7)' },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: S.sm, paddingHorizontal: S.lg, paddingVertical: S.md, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.bg },
  input: { flex: 1, backgroundColor: C.card, borderRadius: R.md, borderWidth: 1, borderColor: C.border, paddingHorizontal: S.md, paddingVertical: S.sm, fontSize: 15, color: C.text, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: R.md, backgroundColor: C.cyan, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
});

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { useHaptics } from '../hooks/useHaptics';
import { supabase } from '../lib/supabase';
import { EmptyState } from '../components/ui/EmptyState';
import { C, S, R, T } from '../theme';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  data?: any;
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { light } = useHaptics();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.id) void loadNotifications();
  }, [user?.id]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications((data || []) as Notification[]);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    light();
    await loadNotifications();
    setRefreshing(false);
  };

  const markAsRead = async (notificationId: string) => {
    light();
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllAsRead = async () => {
    light();
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user!.id)
        .eq('read', false);

      if (error) throw error;
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const getNotificationIcon = (type: string): string => {
    switch (type) {
      case 'booking_confirmed': return 'checkmark-circle';
      case 'booking_cancelled': return 'close-circle';
      case 'ride_starting': return 'car';
      case 'ride_completed': return 'flag';
      case 'payment_received': return 'card';
      case 'message': return 'chatbubble';
      default: return 'notifications';
    }
  };

  const getNotificationColor = (type: string): string => {
    switch (type) {
      case 'booking_confirmed': return C.green;
      case 'booking_cancelled': return C.red;
      case 'ride_starting': return C.cyan;
      case 'ride_completed': return C.green;
      case 'payment_received': return C.gold;
      case 'message': return C.purple;
      default: return C.muted;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={styles.subtitle}>{unreadCount} unread</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllBtn}
            onPress={markAllAsRead}
            accessibilityLabel="Mark all as read"
            accessibilityRole="button"
          >
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={C.cyan} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.cyan} />
          }
        >
          {notifications.length === 0 ? (
            <EmptyState
              icon="notifications-outline"
              title="No notifications"
              subtitle="You're all caught up! Notifications will appear here."
            />
          ) : (
            notifications.map(notification => {
              const icon = getNotificationIcon(notification.type);
              const color = getNotificationColor(notification.type);

              return (
                <TouchableOpacity
                  key={notification.id}
                  style={[styles.notifCard, !notification.read && styles.notifCardUnread]}
                  activeOpacity={0.85}
                  onPress={() => !notification.read && markAsRead(notification.id)}
                  accessibilityLabel={`${notification.title}. ${notification.message}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: !notification.read }}
                >
                  <View style={[styles.iconWrap, { backgroundColor: color + '22' }]}>
                    <Ionicons name={icon as any} size={20} color={color} />
                  </View>

                  <View style={styles.notifContent}>
                    <View style={styles.notifHeader}>
                      <Text style={styles.notifTitle}>{notification.title}</Text>
                      {!notification.read && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={styles.notifMessage}>{notification.message}</Text>
                    <Text style={styles.notifTime}>
                      {new Date(notification.created_at).toLocaleString()}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: S.xl, paddingTop: S.lg, paddingBottom: S.sm },
  title: { ...T.h1 },
  subtitle: { ...T.small, marginTop: 2, color: C.cyan },
  markAllBtn: { backgroundColor: C.cyanDim, borderRadius: R.sm, paddingHorizontal: S.md, paddingVertical: S.xs, borderWidth: 1, borderColor: C.cyanBorder },
  markAllText: { fontSize: 12, fontWeight: '700', color: C.cyan },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: S.xl, paddingBottom: S['4xl'], gap: S.sm },
  notifCard: { flexDirection: 'row', gap: S.md, backgroundColor: C.card, borderRadius: R.lg, padding: S.lg, borderWidth: 1, borderColor: C.border },
  notifCardUnread: { borderColor: C.cyanBorder, backgroundColor: C.card2 },
  iconWrap: { width: 44, height: 44, borderRadius: R.md, alignItems: 'center', justifyContent: 'center' },
  notifContent: { flex: 1, gap: 4 },
  notifHeader: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  notifTitle: { fontSize: 15, fontWeight: '700', color: C.text, flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.cyan },
  notifMessage: { fontSize: 13, color: C.sub, lineHeight: 20 },
  notifTime: { fontSize: 11, color: C.muted, marginTop: 2 },
});

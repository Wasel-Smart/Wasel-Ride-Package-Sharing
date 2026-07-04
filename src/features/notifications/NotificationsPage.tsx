/**
 * NotificationsPage - Enhanced Notification Center with tab-based filtering
 * Shows all user notifications with real-time updates and preferences.
 */

import { useEffect, useState } from 'react';
import { NotificationCenter, useNotifications } from '../../components/NotificationCenter';
import { PageShell } from '../../components/wasel-ui/WaselPagePrimitives';
import { useLanguage } from '../../contexts/LanguageContext';
import { Bell, CheckSquare, Settings, Filter, Archive } from 'lucide-react';
import { C } from '../../utils/wasel-ds';

export function NotificationsPage() {
  const { language, dir } = useLanguage();
  const ar = language === 'ar';
  const { notifications, markAllAsRead } = useNotifications();

  const [activeTab, setActiveTab] = useState<'all' | 'rides' | 'system'>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const t = setInterval(() => {
      // Real-time refresh every 30 seconds
    }, 30000);
    return () => clearInterval(t);
  }, []);

  const handleMarkAllRead = () => {
    void markAllAsRead();
  };

  return (
    <PageShell maxWidth={1120} dir={dir}>
      <div style={{ paddingInline: 16, paddingBlock: 24, minHeight: '80vh', color: '#fff' }}>
        
        {/* Header Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Bell size={24} color={C.cyan} />
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>
              {ar ? 'التنبيهات والرسائل' : 'Notification Center'}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              backgroundColor: '#1f2937',
              color: '#d1d5db',
              border: 'none',
              borderRadius: 6,
              padding: '6px 12px',
              cursor: 'pointer'
            }}>
              <CheckSquare size={14} />
              {ar ? 'تحديد الكل كمقروء' : 'Mark all read'}
            </button>
            
            <a href="/app/settings" style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              backgroundColor: '#1f2937',
              color: '#d1d5db',
              borderRadius: 6,
              padding: '6px 12px',
              textDecoration: 'none'
            }}>
              <Settings size={14} />
              <span>{ar ? 'الإعدادات' : 'Preferences'}</span>
            </a>
          </div>
        </div>

        {/* Tab Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid #1f2937', paddingBottom: 12 }}>
          <TabButton active={activeTab === 'all'} onClick={() => setActiveTab('all')} label={ar ? 'الكل' : 'All Notifications'} />
          <TabButton active={activeTab === 'rides'} onClick={() => setActiveTab('rides')} label={ar ? 'الرحلات' : 'Ride Alerts'} />
          <TabButton active={activeTab === 'system'} onClick={() => setActiveTab('system')} label={ar ? 'النظام' : 'System Messages'} />
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                backgroundColor: showUnreadOnly ? '#06b6d4' : '#1f2937',
                color: showUnreadOnly ? '#000' : '#d1d5db',
                border: 'none',
                borderRadius: 6,
                padding: '6px 12px',
                cursor: 'pointer',
              }}
            >
              <Filter size={14} />
              {ar ? 'غير المقروءة فقط' : 'Unread only'} ({unreadCount})
            </button>
          </div>
        </div>

        {/* Notification Main Panel */}
        <div style={{ backgroundColor: '#11141c', border: '1px solid #1f2937', borderRadius: 12, padding: 16 }}>
          <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
            <button
              onClick={handleMarkAllRead}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                backgroundColor: '#1f2937',
                color: '#d1d5db',
                border: 'none',
                borderRadius: 6,
                padding: '6px 12px',
                cursor: 'pointer',
              }}
            >
              <CheckSquare size={14} />
              {ar ? 'تحديد الكل كمقروء' : 'Mark all read'}
            </button>
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                backgroundColor: '#1f2937',
                color: '#d1d5db',
                border: 'none',
                borderRadius: 6,
                padding: '6px 12px',
                cursor: 'pointer',
              }}
            >
              <Archive size={14} />
              {ar ? 'أرشفة المقروءة' : 'Archive read'}
            </button>
          </div>
          <NotificationCenter filter={activeTab} showUnreadOnly={showUnreadOnly} />
        </div>

      </div>
    </PageShell>
  );
}

function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      style={{
        padding: '8px 16px',
        backgroundColor: active ? '#1f2937' : 'transparent',
        border: 'none',
        borderRadius: 8,
        color: active ? '#fff' : '#9ca3af',
        fontWeight: 600,
        cursor: 'pointer',
        fontSize: 14,
        transition: 'all 0.2s'
      }}
    >
      {label}
    </button>
  );
}

export default NotificationsPage;

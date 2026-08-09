import api from '../utils/api';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  data?: Record<string, unknown>;
  created_at: string;
}

export async function getNotifications(page = 1, limit = 20) {
  const response = await api.get(`/notifications?page=${page}&limit=${limit}`);
  return response as { data: Notification[]; meta: { total: number; page: number; limit: number } };
}

export async function markNotificationRead(id: string) {
  const response = await api.patch(`/notifications/${id}/read`, {});
  return response as { data: Notification };
}

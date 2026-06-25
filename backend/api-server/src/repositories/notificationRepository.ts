import { getDb } from '@wasel/backend-shared/db';
import { logger } from '@wasel/backend-shared/logging/logger';
import { NotFoundError, ValidationError, InternalError } from '@wasel/backend-shared/errors/app-errors';

export interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  title_ar?: string;
  message: string;
  message_ar?: string;
  data: Record<string, unknown>;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  channel: string;
  read: boolean;
  created_at: string;
}

export class NotificationRepository {
  private db = getDb();

  async create(userId: string, input: {
    type: string;
    title: string;
    titleAr?: string;
    message: string;
    messageAr?: string;
    data?: Record<string, unknown>;
    channel?: string;
  }): Promise<NotificationRow> {
    try {
      const result = await this.db.unsafe(
        `INSERT INTO notifications (user_id, type, title, title_ar, message, message_ar, data, status, channel)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)
         RETURNING *`,
        [
          userId,
          input.type,
          input.title,
          input.titleAr || null,
          input.message,
          input.messageAr || null,
          JSON.stringify(input.data || {}),
          input.channel || 'in_app',
        ]
      );
      return result[0] as unknown as NotificationRow;
    } catch (error) {
      logger.error({ error, userId, input }, 'Failed to create notification');
      throw new InternalError('Failed to create notification', error as Error);
    }
  }

  async findForUser(userId: string, page: number, limit: number): Promise<{ data: NotificationRow[]; meta: { total: number; page: number; limit: number } }> {
    const offset = (page - 1) * limit;

    const countResult = await this.db.unsafe(
      'SELECT COUNT(*) as total FROM notifications WHERE user_id = $1',
      [userId]
    );
    const total = Number(countResult[0]?.total || 0);

    const data = await this.db.unsafe(
      `SELECT * FROM notifications WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return {
      data: data as unknown as NotificationRow[],
      meta: { total, page, limit },
    };
  }

  async markAsRead(id: string, userId: string): Promise<NotificationRow | null> {
    const result = await this.db.unsafe(
      `UPDATE notifications SET read = true, read_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId]
    );
    return (result[0] as unknown as NotificationRow) || null;
  }
}

export const notificationRepository = new NotificationRepository();

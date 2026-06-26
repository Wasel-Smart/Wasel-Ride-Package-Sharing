import { Router, Request, Response } from 'express';
import { notificationService } from '../../services/notificationService.ts';
import { authenticate } from '../../middleware/auth.ts';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as unknown as { user: { id: string } }).user.id;
    const { page = 1, limit = 20 } = req.query;
    const result = await notificationService.getNotifications(userId, Number(page), Number(limit));
    res.json({ success: true, data: result.data, meta: result.meta });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch notifications' } });
  }
});

router.patch('/:id/read', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as unknown as { user: { id: string } }).user.id;
    const notification = await notificationService.markAsRead(req.params.id, userId);
    res.json({ success: true, data: notification });
  } catch (error) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Notification not found' } });
  }
});

export default router;



import { Router } from 'express';
import notificationService from '../services/notificationService.js';
import { authenticate } from '../middleware/auth.js';
const router = Router();
router.get('/', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20 } = req.query;
        const result = await notificationService.getNotifications(userId, Number(page), Number(limit));
        res.json({ success: true, data: result.data, meta: result.meta });
    }
    catch (error) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch notifications' } });
    }
});
router.patch('/:id/read', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const notification = await notificationService.markAsRead(req.params.id, userId);
        res.json({ success: true, data: notification });
    }
    catch (error) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Notification not found' } });
    }
});
export default router;

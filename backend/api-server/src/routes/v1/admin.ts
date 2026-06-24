import { Router, Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/rides/active', authenticate, requireRole(['admin', 'operator']), async (_req: Request, res: Response) => {
  res.json({ success: true, data: [], meta: { total: 0, page: 1, limit: 20 } });
});

router.patch('/rides/:id/dispatch', authenticate, requireRole(['admin', 'operator']), async (req: Request, res: Response) => {
  res.json({ success: true, data: { id: req.params.id, status: 'in_progress' } });
});

router.get('/disputes', authenticate, requireRole(['admin', 'operator']), async (_req: Request, res: Response) => {
  res.json({ success: true, data: [], meta: { total: 0, page: 1, limit: 20 } });
});

router.patch('/disputes/:id/resolve', authenticate, requireRole(['admin', 'operator']), async (req: Request, res: Response) => {
  res.json({ success: true, data: { id: req.params.id, status: 'resolved' } });
});

export default router;

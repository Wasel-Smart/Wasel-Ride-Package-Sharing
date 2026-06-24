import { Router, Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { tripService } from '../services/tripService';
import { ratingService } from '../services/ratingService';
import { z } from 'zod';

const router = Router();

const AdminTripQuerySchema = z.object({
  status: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

router.get('/rides/active', authenticate, requireRole(['admin', 'operator']), async (req: Request, res: Response) => {
  try {
    const filters = AdminTripQuerySchema.parse(req.query);
    const result = await tripService.searchTrips({ ...filters, seats: 1 });
    res.json({ success: true, data: result.data, meta: result.meta });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: (error as Error).message } });
  }
});

router.patch('/rides/:id/dispatch', authenticate, requireRole(['admin', 'operator']), async (req: Request, res: Response) => {
  try {
    const { driverId } = req.body;
    const trip = await tripService.updateTripStatus(req.params.id, driverId, 'in_progress');
    res.json({ success: true, data: trip });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: (error as Error).message } });
  }
});

router.get('/disputes', authenticate, requireRole(['admin', 'operator']), async (_req: Request, res: Response) => {
  res.json({ success: true, data: [], meta: { total: 0, page: 1, limit: 20 } });
});

router.patch('/disputes/:id/resolve', authenticate, requireRole(['admin', 'operator']), async (_req: Request, res: Response) => {
  res.json({ success: true, data: { id: req.params.id, status: 'resolved' } });
});

export default router;

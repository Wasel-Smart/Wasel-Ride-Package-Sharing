import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth.ts';
import { tripRepository } from '../../repositories/tripRepository.ts';
import { packageRepository } from '../../repositories/packageRepository.ts';
import { ratingRepository } from '../../repositories/ratingRepository.ts';
import { walletRepository } from '../../repositories/walletRepository.ts';
import { z } from 'zod';

const router = Router();

const DriverQuerySchema = z.object({
  status: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

router.get('/trips', authenticate, async (req: Request, res: Response) => {
  try {
    const driverId = (req as unknown as { user: { id: string } }).user.id;
    const filters = DriverQuerySchema.parse(req.query);
    const result = await tripRepository.findAvailableTrips({ ...filters, seats: 1 });

    const myTrips = (result.data as unknown as { driver_id: string }[]).filter(t => t.driver_id === driverId);

    res.json({ success: true, data: myTrips, meta: { total: myTrips.length, page: 1, limit: 50 } });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: (error as Error).message } });
  }
});

router.get('/earnings', authenticate, async (req: Request, res: Response) => {
  try {
    const driverId = (req as unknown as { user: { id: string } }).user.id;
    const transactions = await walletRepository.getTransactions(driverId, 1, 50);
    const earnings = transactions.data.filter(t => t.type === 'payout' || t.type === 'payment');
    const totalEarnings = earnings.reduce((sum, t) => sum + Math.abs(t.amount), 0);

    res.json({ success: true, data: { totalEarnings, transactions: earnings } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch earnings' } });
  }
});

router.get('/packages/assignments', authenticate, async (req: Request, res: Response) => {
  try {
    const driverId = (req as unknown as { user: { id: string } }).user.id;
    const packages = await packageRepository.findPackagesByStatus('matched');
    const myPackages = packages.filter(p => (p as unknown as { carrier_id: string }).carrier_id === driverId);
    res.json({ success: true, data: myPackages });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch assignments' } });
  }
});

router.post('/packages/:id/confirm-pickup', authenticate, async (req: Request, res: Response) => {
  try {
    const pkg = await packageRepository.updatePackageStatus(req.params.id, 'picked_up');
    res.json({ success: true, data: pkg });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: (error as Error).message } });
  }
});

router.post('/packages/:id/confirm-delivery', authenticate, async (req: Request, res: Response) => {
  try {
    const pkg = await packageRepository.updatePackageStatus(req.params.id, 'delivered');
    res.json({ success: true, data: pkg });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: (error as Error).message } });
  }
});

router.get('/ratings', authenticate, async (req: Request, res: Response) => {
  try {
    const driverId = (req as unknown as { user: { id: string } }).user.id;
    const { page = 1, limit = 10 } = req.query as { page?: number; limit?: number };
    const result = await ratingRepository.findRatingsForUser(driverId, Number(page), Number(limit));
    res.json({ success: true, data: result.data, meta: result.meta });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch ratings' } });
  }
});

export default router;



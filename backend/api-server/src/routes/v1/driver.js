import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { tripRepository } from '../repositories/tripRepository.js';
import { packageRepository } from '../repositories/packageRepository.js';
import { ratingRepository } from '../repositories/ratingRepository.js';
import { walletRepository } from '../repositories/walletRepository.js';
import { z } from 'zod';
const router = Router();
const DriverQuerySchema = z.object({
    status: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(20),
});
router.get('/trips', authenticate, async (req, res) => {
    try {
        const driverId = req.user.id;
        const filters = DriverQuerySchema.parse(req.query);
        const result = await tripRepository.findAvailableTrips({ ...filters, seats: 1 });
        const myTrips = result.data.filter(t => t.driver_id === driverId);
        res.json({ success: true, data: myTrips, meta: { total: myTrips.length, page: 1, limit: 50 } });
    }
    catch (error) {
        res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: error.message } });
    }
});
router.get('/earnings', authenticate, async (req, res) => {
    try {
        const driverId = req.user.id;
        const transactions = await walletRepository.getTransactions(driverId, 1, 50);
        const earnings = transactions.data.filter(t => t.type === 'payout' || t.type === 'payment');
        const totalEarnings = earnings.reduce((sum, t) => sum + Math.abs(t.amount), 0);
        res.json({ success: true, data: { totalEarnings, transactions: earnings } });
    }
    catch (error) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch earnings' } });
    }
});
router.get('/packages/assignments', authenticate, async (req, res) => {
    try {
        const driverId = req.user.id;
        const packages = await packageRepository.findPackagesByStatus('matched');
        const myPackages = packages.filter(p => p.carrier_id === driverId);
        res.json({ success: true, data: myPackages });
    }
    catch (error) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch assignments' } });
    }
});
router.post('/packages/:id/confirm-pickup', authenticate, async (req, res) => {
    try {
        const pkg = await packageRepository.updatePackageStatus(req.params.id, 'picked_up');
        res.json({ success: true, data: pkg });
    }
    catch (error) {
        res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: error.message } });
    }
});
router.post('/packages/:id/confirm-delivery', authenticate, async (req, res) => {
    try {
        const pkg = await packageRepository.updatePackageStatus(req.params.id, 'delivered');
        res.json({ success: true, data: pkg });
    }
    catch (error) {
        res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: error.message } });
    }
});
router.get('/ratings', authenticate, async (req, res) => {
    try {
        const driverId = req.user.id;
        const { page = 1, limit = 10 } = req.query;
        const result = await ratingRepository.findRatingsForUser(driverId, Number(page), Number(limit));
        res.json({ success: true, data: result.data, meta: result.meta });
    }
    catch (error) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch ratings' } });
    }
});
export default router;

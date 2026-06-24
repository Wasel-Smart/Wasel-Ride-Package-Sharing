import { Router } from 'express';
import walletService from '../services/walletService.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { z } from 'zod';
const router = Router();
const TopUpSchema = z.object({
    amount: z.number().positive().max(10000),
});
const TransactionsQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
});
router.get('/:userId/balance', authenticate, async (req, res) => {
    try {
        const userId = req.params.userId;
        const currentUserId = req.user.id;
        if (userId !== currentUserId) {
            return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
        }
        const balance = await walletService.getBalance(userId);
        res.json({ success: true, data: balance });
    }
    catch (error) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch balance' } });
    }
});
router.post('/:userId/topup', authenticate, validate(TopUpSchema), async (req, res) => {
    try {
        const { amount } = TopUpSchema.parse(req.body);
        const userId = req.params.userId;
        const currentUserId = req.user.id;
        if (userId !== currentUserId) {
            return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
        }
        const tx = await walletService.topUp(userId, amount, `Wallet top-up`);
        res.status(201).json({ success: true, data: tx });
    }
    catch (error) {
        res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: error.message } });
    }
});
router.get('/:userId/transactions', authenticate, async (req, res) => {
    try {
        const userId = req.params.userId;
        const currentUserId = req.user.id;
        if (userId !== currentUserId) {
            return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
        }
        const { page = 1, limit = 20 } = TransactionsQuerySchema.parse(req.query);
        const result = await walletService.getTransactions(userId, Number(page), Number(limit));
        res.json({ success: true, data: result.data, meta: result.meta });
    }
    catch (error) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch transactions' } });
    }
});
export default router;

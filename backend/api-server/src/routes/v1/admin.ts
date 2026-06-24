import { Router, Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { tripRepository } from '../repositories/tripRepository.js';
import { packageRepository } from '../repositories/packageRepository.js';
import { ratingRepository } from '../repositories/ratingRepository.js';
import { notificationRepository } from '../repositories/notificationRepository.js';
import { walletRepository } from '../repositories/walletRepository.js';
import { busRepository } from '../repositories/busRepository.js';
import { z } from 'zod';

const router = Router();

const AdminQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.string().optional(),
});

router.get('/rides/active', authenticate, requireRole(['admin', 'operator']), async (req: Request, res: Response) => {
  try {
    const filters = AdminQuerySchema.parse(req.query);
    const result = await tripRepository.findAvailableTrips({ ...filters, seats: 1 });
    res.json({ success: true, data: result.data, meta: result.meta });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: (error as Error).message } });
  }
});

router.get('/packages/pending', authenticate, requireRole(['admin', 'operator']), async (req: Request, res: Response) => {
  try {
    const packages = await packageRepository.findPackagesByStatus('created');
    res.json({ success: true, data: packages });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch packages' } });
  }
});

router.get('/users', authenticate, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const db = await import('@wasel/backend-shared/db').then(m => m.getDb());
    const { page = 1, limit = 20 } = req.query as { page?: number; limit?: number };
    const offset = (page - 1) * limit;

    const countResult = await db.unsafe('SELECT COUNT(*) as total FROM users');
    const total = Number(countResult[0]?.total || 0);

    const users = await db.unsafe(
      'SELECT id, email, phone, full_name, role, is_active, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    res.json({ success: true, data: users, meta: { total, page, limit } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch users' } });
  }
});

router.patch('/users/:id/status', authenticate, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const db = await import('@wasel/backend-shared/db').then(m => m.getDb());
    const result = await db.unsafe(
      'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, full_name, role, is_active',
      [status === 'active', req.params.id]
    );
    if (!result[0]) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    }
    res.json({ success: true, data: result[0] });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: (error as Error).message } });
  }
});

router.get('/payments/reconciliation', authenticate, requireRole(['admin', 'operator']), async (req: Request, res: Response) => {
  try {
    const db = await import('@wasel/backend-shared/db').then(m => m.getDb());
    const { page = 1, limit = 20 } = req.query as { page?: number; limit?: number };
    const offset = (page - 1) * limit;

    const countResult = await db.unsafe("SELECT COUNT(*) as total FROM payments WHERE status = 'pending'");
    const total = Number(countResult[0]?.total || 0);

    const payments = await db.unsafe(
      `SELECT p.*, u.full_name as user_name, t.origin_name, t.destination_name
       FROM payments p
       LEFT JOIN users u ON p.user_id = u.id
       LEFT JOIN trips t ON p.trip_id = t.id
       WHERE p.status = 'pending'
       ORDER BY p.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({ success: true, data: payments, meta: { total, page, limit } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch payments' } });
  }
});

router.get('/disputes', authenticate, requireRole(['admin', 'operator']), async (req: Request, res: Response) => {
  try {
    const db = await import('@wasel/backend-shared/db').then(m => m.getDb());
    const { page = 1, limit = 20 } = req.query as { page?: number; limit?: number };
    const offset = (page - 1) * limit;

    const countResult = await db.unsafe('SELECT COUNT(*) as total FROM safety_incidents WHERE status = \'pending\'');
    const total = Number(countResult[0]?.total || 0);

    const incidents = await db.unsafe(
      `SELECT si.*, u1.full_name as reporter_name, u2.full_name as reported_against_name
       FROM safety_incidents si
       LEFT JOIN users u1 ON si.reported_by = u1.id
       LEFT JOIN users u2 ON si.reported_against = u2.id
       WHERE si.status = 'pending'
       ORDER BY si.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({ success: true, data: incidents, meta: { total, page, limit } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch disputes' } });
  }
});

router.patch('/disputes/:id/resolve', authenticate, requireRole(['admin', 'operator']), async (req: Request, res: Response) => {
  try {
    const db = await import('@wasel/backend-shared/db').then(m => m.getDb());
    const { resolution, action } = req.body;
    const userId = (req as unknown as { user: { id: string } }).user.id;

    const result = await db.unsafe(
      `UPDATE safety_incidents
       SET status = 'resolved', resolution = $1, resolved_by = $2, resolved_at = NOW(), updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [resolution, userId, req.params.id]
    );

    if (!result[0]) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Dispute not found' } });
    }

    res.json({ success: true, data: result[0] });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: (error as Error).message } });
  }
});

router.patch('/rides/:id/dispatch', authenticate, requireRole(['admin', 'operator']), async (req: Request, res: Response) => {
  try {
    const { driverId } = req.body;
    const trip = await tripRepository.updateTripStatus(req.params.id, driverId, 'in_progress');
    res.json({ success: true, data: trip });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: (error as Error).message } });
  }
});

router.get('/dashboard/metrics', authenticate, requireRole(['admin', 'operator']), async (req: Request, res: Response) => {
  try {
    const db = await import('@wasel/backend-shared/db').then(m => m.getDb());

    const [
      activeTrips,
      totalPackages,
      pendingDisputes,
      totalRevenue,
      activeUsers,
    ] = await Promise.all([
      db.unsafe("SELECT COUNT(*) as count FROM trips WHERE status = 'in_progress'"),
      db.unsafe("SELECT COUNT(*) as count FROM packages WHERE status IN ('created', 'matched', 'in_transit')"),
      db.unsafe("SELECT COUNT(*) as count FROM safety_incidents WHERE status = 'pending'"),
      db.unsafe("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'completed'"),
      db.unsafe("SELECT COUNT(*) as count FROM users WHERE is_active = true"),
    ]);

    res.json({
      success: true,
      data: {
        activeTrips: Number(activeTrips[0]?.count || 0),
        totalPackages: Number(totalPackages[0]?.count || 0),
        pendingDisputes: Number(pendingDisputes[0]?.count || 0),
        totalRevenueJOD: Number(totalRevenue[0]?.total || 0),
        activeUsers: Number(activeUsers[0]?.count || 0),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch metrics' } });
  }
});

export default router;

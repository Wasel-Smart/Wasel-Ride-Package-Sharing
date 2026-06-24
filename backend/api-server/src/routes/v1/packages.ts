import { Router, Request, Response } from 'express';
import { packageService } from '../services/packageService';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

const CreatePackageSchema = z.object({
  originCity: z.string().min(1),
  originCoords: z.object({ lat: z.number(), lng: z.number() }),
  destinationCity: z.string().min(1),
  destinationCoords: z.object({ lat: z.number(), lng: z.number() }),
  receiverName: z.string().min(1),
  receiverPhone: z.string().regex(/^\+?[1-9]\d{7,14}$/, 'Invalid phone number'),
  size: z.enum(['small', 'medium', 'large', 'extra_large']),
  weight: z.number().positive().optional(),
  description: z.string().optional(),
  declaredValue: z.number().positive().optional(),
  fragile: z.boolean().optional(),
});

const UpdateStatusSchema = z.object({
  status: z.enum(['matched', 'accepted', 'picked_up', 'in_transit', 'delivered', 'failed', 'returned', 'cancelled']),
  carrierId: z.string().uuid().optional(),
});

router.post('/', authenticate, validate('body', CreatePackageSchema), async (req: Request, res: Response) => {
  try {
    const input = CreatePackageSchema.parse(req.body);
    const userId = (req as unknown as { user: { id: string } }).user.id;
    const pkg = await packageService.createPackage({ ...input, senderId: userId });
    res.status(201).json({ success: true, data: pkg });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: (error as Error).message } });
  }
});

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const pkg = await packageService.getPackage(req.params.id);
    res.json({ success: true, data: pkg });
  } catch (error) {
    if ((error as Error).message === 'Package not found') {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Package not found' } });
    }
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch package' } });
  }
});

router.get('/sender/:senderId', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as unknown as { user: { id: string } }).user.id;
    if (req.params.senderId !== userId) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
    }
    const packages = await packageService.getPackagesBySender(userId);
    res.json({ success: true, data: packages });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch packages' } });
  }
});

router.post('/:id/assign-to-trip', authenticate, async (req: Request, res: Response) => {
  try {
    const { tripId } = req.body;
    const userId = (req as unknown as { user: { id: string } }).user.id;
    const pkg = await packageService.assignToTrip(req.params.id, tripId, userId);
    res.json({ success: true, data: pkg });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: (error as Error).message } });
  }
});

router.post('/:id/status', authenticate, validate('body', UpdateStatusSchema), async (req: Request, res: Response) => {
  try {
    const { status, carrierId } = UpdateStatusSchema.parse(req.body);
    const userId = (req as unknown as { user: { id: string } }).user.id;
    const pkg = await packageService.updateStatus(req.params.id, status, carrierId || userId);
    res.json({ success: true, data: pkg });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: (error as Error).message } });
  }
});

export default router;

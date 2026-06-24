import { Router, Request, Response } from 'express';
import ratingService from '../services/ratingService.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { z } from 'zod';

const router = Router();

const CreateRatingSchema = z.object({
  targetId: z.string().uuid(),
  targetType: z.enum(['driver', 'passenger', 'bus_operator']),
  tripId: z.string().uuid().optional(),
  score: z.number().int().min(1).max(5),
  comment: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

router.post('/', authenticate, validate(CreateRatingSchema), async (req: Request, res: Response) => {
  try {
    const input = CreateRatingSchema.parse(req.body);
    const userId = (req as unknown as { user: { id: string } }).user.id;
    const rating = await ratingService.submitRating({ ...input, raterId: userId });
    res.status(201).json({ success: true, data: rating });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: (error as Error).message } });
  }
});

router.get('/:targetId', authenticate, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const result = await ratingService.getRatingsForUser(req.params.targetId, Number(page), Number(limit));
    res.json({ success: true, data: result.data, meta: result.meta });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch ratings' } });
  }
});

export default router;

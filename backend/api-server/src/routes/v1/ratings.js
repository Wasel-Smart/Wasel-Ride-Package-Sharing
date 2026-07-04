import { Router } from 'express';
import { authenticate } from '../../middleware/auth.ts';
import { validate } from '../../middleware/validate.ts';
import { tripRepository } from '../../repositories/tripRepository.ts';
import { ratingRepository } from '../../repositories/ratingRepository.ts';
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
router.post('/', authenticate, validate(CreateRatingSchema), async (req, res) => {
    try {
        const input = CreateRatingSchema.parse(req.body);
        const userId = req.user.id;
        if (input.tripId) {
            const bookingCheck = await tripRepository.findBookingById(input.tripId);
            if (!bookingCheck) {
                return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Trip booking not found' } });
            }
            if (bookingCheck.passenger_id !== userId) {
                return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only rate trips you participated in' } });
            }
        }
        const rating = await ratingRepository.createRating({
            raterId: userId,
            targetId: input.targetId,
            targetType: input.targetType,
            tripId: input.tripId,
            score: input.score,
            comment: input.comment,
            tags: input.tags,
        });
        res.status(201).json({ success: true, data: rating });
    }
    catch (error) {
        res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: error.message } });
    }
});
router.get('/trip/:tripId', authenticate, async (req, res) => {
    try {
        const ratings = await ratingRepository.findRatingsByTrip(req.params.tripId);
        res.json({ success: true, data: ratings });
    }
    catch (error) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch ratings' } });
    }
});
export default router;

import { Router } from 'express';
import busService from '../services/busService.js';
import { authenticate } from '../middleware/auth.js';
import { validate, validateQuery } from '../middleware/validate.js';
import { z } from 'zod';
const router = Router();
const BusSearchSchema = z.object({
    originCity: z.string().optional(),
    destinationCity: z.string().optional(),
});
const BusBookSchema = z.object({
    scheduleId: z.string().uuid(),
    seats: z.number().int().min(1).max(10),
});
router.get('/routes', validateQuery(BusSearchSchema), async (req, res) => {
    try {
        const filters = BusSearchSchema.parse(req.query);
        const routes = await busService.searchRoutes(filters.originCity, filters.destinationCity);
        res.json({ success: true, data: routes });
    }
    catch (error) {
        res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: error.message } });
    }
});
router.get('/routes/:routeId/schedules', async (req, res) => {
    try {
        const { date } = req.query;
        const schedules = await busService.getRouteSchedules(req.params.routeId, date);
        res.json({ success: true, data: schedules });
    }
    catch (error) {
        if (error.message === 'Bus route not found') {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
        }
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch schedules' } });
    }
});
router.post('/bookings', authenticate, validate(BusBookSchema), async (req, res) => {
    try {
        const { scheduleId, seats } = BusBookSchema.parse(req.body);
        const userId = req.user.id;
        const booking = await busService.bookSeat(scheduleId, userId, seats);
        res.status(201).json({ success: true, data: booking });
    }
    catch (error) {
        res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: error.message } });
    }
});
router.patch('/bookings/:id/cancel', authenticate, async (req, res) => {
    try {
        const booking = await busService.cancelBooking(req.params.id);
        res.json({ success: true, data: booking });
    }
    catch (error) {
        if (error.message === 'Bus booking not found') {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Booking not found' } });
        }
        res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: error.message } });
    }
});
export default router;

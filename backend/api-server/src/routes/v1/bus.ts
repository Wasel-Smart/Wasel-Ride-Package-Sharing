import { Router, Request, Response } from 'express';
import busService from '../services/busService.ts';
import { authenticate } from '../middleware/auth.ts';
import { validate, validateQuery } from '../middleware/validate.ts';
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

router.get('/routes', validateQuery(BusSearchSchema), async (req: Request, res: Response) => {
  try {
    const filters = BusSearchSchema.parse(req.query);
    const routes = await busService.searchRoutes(filters.originCity, filters.destinationCity);
    res.json({ success: true, data: routes });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: (error as Error).message } });
  }
});

router.get('/routes/:routeId/schedules', async (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    const schedules = await busService.getRouteSchedules(req.params.routeId, date as string | undefined);
    res.json({ success: true, data: schedules });
  } catch (error) {
    if ((error as Error).message === 'Bus route not found') {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
    }
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch schedules' } });
  }
});

router.post('/bookings', authenticate, validate(BusBookSchema), async (req: Request, res: Response) => {
  try {
    const { scheduleId, seats } = BusBookSchema.parse(req.body);
    const userId = (req as unknown as { user: { id: string } }).user.id;
    const booking = await busService.bookSeat(scheduleId, userId, seats);
    res.status(201).json({ success: true, data: booking });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: (error as Error).message } });
  }
});

router.patch('/bookings/:id/cancel', authenticate, async (req: Request, res: Response) => {
  try {
    const booking = await busService.cancelBooking(req.params.id);
    res.json({ success: true, data: booking });
  } catch (error) {
    if ((error as Error).message === 'Bus booking not found') {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Booking not found' } });
    }
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: (error as Error).message } });
  }
});

export default router;


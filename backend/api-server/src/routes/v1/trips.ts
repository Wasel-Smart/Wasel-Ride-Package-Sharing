import { Router, Request, Response } from 'express';
import tripService from '../../services/tripService.ts';
import { authenticate, requireRole } from '../../middleware/auth.ts';
import { validate } from '../../middleware/validate.ts';
import { z } from 'zod';

const router = Router();

const CreateTripSchema = z.object({
  mode: z.enum(['carpooling', 'on_demand', 'scheduled', 'package', 'return']),
  originCity: z.string().min(1),
  originCoords: z.object({ lat: z.number(), lng: z.number() }),
  destinationCity: z.string().min(1),
  destinationCoords: z.object({ lat: z.number(), lng: z.number() }),
  departureTime: z.string().datetime(),
  availableSeats: z.number().int().min(1).max(8),
  pricePerSeat: z.number().positive().optional(),
  allowPackages: z.boolean().optional(),
  packageCapacityKg: z.number().positive().optional(),
  notes: z.string().optional(),
});

const SearchTripsSchema = z.object({
  originCity: z.string().optional(),
  destinationCity: z.string().optional(),
  departureDate: z.string().optional(),
  seats: z.coerce.number().int().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

const BookTripSchema = z.object({
  seats: z.number().int().min(1),
  pricePaid: z.number().positive(),
});

router.get('/search', validateQuery(SearchTripsSchema), async (req: Request, res: Response) => {
  try {
    const filters = SearchTripsSchema.parse(req.query);
    const result = await tripService.searchTrips(filters);
    res.json({ success: true, data: result.data, meta: result.meta });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: (error as Error).message } });
  }
});

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const trip = await tripService.getTripDetails(req.params.id);
    res.json({ success: true, data: trip });
  } catch (error) {
    if ((error as Error).message === 'Trip not found') {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Trip not found' } });
    }
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch trip' } });
  }
});

router.post('/', authenticate, requireRole(['driver', 'admin']), validate(CreateTripSchema), async (req: Request, res: Response) => {
  try {
    const input = CreateTripSchema.parse(req.body);
    const userId = (req as unknown as { user: { id: string } }).user.id;
    const trip = await tripService.createTrip({
      ...input,
      createdBy: userId,
    });
    res.status(201).json({ success: true, data: trip });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: (error as Error).message } });
  }
});

router.post('/:id/book', authenticate, validate(BookTripSchema), async (req: Request, res: Response) => {
  try {
    const { seats, pricePaid } = BookTripSchema.parse(req.body);
    const userId = (req as unknown as { user: { id: string } }).user.id;
    const booking = await tripService.bookTrip(req.params.id, userId, seats, pricePaid);
    res.status(201).json({ success: true, data: booking });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: (error as Error).message } });
  }
});

router.patch('/:id/status', authenticate, async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const userId = (req as unknown as { user: { id: string } }).user.id;
    const trip = await tripService.updateTripStatus(req.params.id, userId, status);
    res.json({ success: true, data: trip });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: (error as Error).message } });
  }
});

export default router;



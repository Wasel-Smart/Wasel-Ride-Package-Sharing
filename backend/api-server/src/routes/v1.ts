import { Router } from 'express';
import tripRoutes from './v1/trips.ts';
import packageRoutes from './v1/packages.ts';
import busRoutes from './v1/bus.ts';
import walletRoutes from './v1/wallet.ts';
import ratingRoutes from './v1/ratings.ts';
import notificationRoutes from './v1/notifications.ts';
import driverRoutes from './v1/driver.ts';
import adminRoutes from './v1/admin.ts';
import corporateRoutes from './v1/corporate.ts';

const router = Router();

router.use('/trips', tripRoutes);
router.use('/packages', packageRoutes);
router.use('/bus', busRoutes);
router.use('/wallet', walletRoutes);
router.use('/ratings', ratingRoutes);
router.use('/notifications', notificationRoutes);
router.use('/driver', driverRoutes);
router.use('/admin', adminRoutes);
router.use('/corporate', corporateRoutes);

export default router;

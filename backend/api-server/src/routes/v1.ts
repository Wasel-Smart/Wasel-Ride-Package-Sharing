import { Router } from 'express';
import tripRoutes from './v1/trips';
import packageRoutes from './v1/packages';
import busRoutes from './v1/bus';
import walletRoutes from './v1/wallet';
import ratingRoutes from './v1/ratings';
import notificationRoutes from './v1/notifications';
import adminRoutes from './v1/admin';
import corporateRoutes from './v1/corporate';

const router = Router();

router.use('/trips', tripRoutes);
router.use('/packages', packageRoutes);
router.use('/bus', busRoutes);
router.use('/wallet', walletRoutes);
router.use('/ratings', ratingRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);
router.use('/corporate', corporateRoutes);

export default router;

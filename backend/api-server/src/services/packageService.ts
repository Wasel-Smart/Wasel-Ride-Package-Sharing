import { packageRepository } from '../repositories/packageRepository.js';
import { notificationRepository } from '../repositories/notificationRepository.js';
import { NotFoundError, ValidationError, InternalError } from '@wasel/backend-shared/errors/app-errors';

export class PackageService {
  async createPackage(input: {
    senderId: string;
    originCity: string;
    originCoords: { lat: number; lng: number };
    destinationCity: string;
    destinationCoords: { lat: number; lng: number };
    receiverName: string;
    receiverPhone: string;
    size: 'small' | 'medium' | 'large' | 'extra_large';
    weight?: number;
    description?: string;
    declaredValue?: number;
    fragile?: boolean;
  }) {
    const pkg = await packageRepository.createPackage(input);

    await notificationRepository.create(input.senderId, {
      type: 'package_created',
      title: 'Package Request Created',
      titleAr: 'تم إنشاء طلب الطرد',
      message: `Your package delivery from ${input.originCity} to ${input.destinationCity} has been registered. Tracking: ${pkg.tracking_number}`,
      messageAr: `تم تسجيل طلب توصيل طردك من ${input.originCity} إلى ${input.destinationCity}. التتبع: ${pkg.tracking_number}`,
      channel: 'in_app',
      data: { packageId: pkg.id, trackingNumber: pkg.tracking_number },
    });

    return pkg;
  }

  async getPackage(id: string) {
    const pkg = await packageRepository.findPackageById(id);
    if (!pkg) {
      throw new NotFoundError('Package');
    }
    return pkg;
  }

  async getPackagesBySender(senderId: string) {
    return packageRepository.findPackagesBySender(senderId);
  }

  async updateStatus(id: string, status: string, carrierId?: string) {
    const validStatuses = ['matched', 'accepted', 'picked_up', 'in_transit', 'delivered', 'failed', 'returned', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new ValidationError(`Invalid package status: ${status}`);
    }

    const pkg = await packageRepository.updatePackageStatus(id, status, carrierId);

    if (status === 'delivered') {
      await notificationRepository.create(pkg.sender_id, {
        type: 'package_delivered',
        title: 'Package Delivered',
        titleAr: 'تم توصيل الطرد',
        message: `Your package ${pkg.tracking_number} has been delivered.`,
        messageAr: `تم توصيل طردك ${pkg.tracking_number}.`,
        channel: 'in_app',
        data: { packageId: pkg.id, trackingNumber: pkg.tracking_number },
      });
    }

    return pkg;
  }

  async assignToTrip(packageId: string, tripId: string, carrierId: string) {
    const pkg = await packageRepository.assignPackageToTrip(packageId, tripId, carrierId);

    await notificationRepository.create(carrierId, {
      type: 'package_assigned',
      title: 'Package Assigned to You',
      titleAr: 'تم تعيين طرد لك',
      message: `You have been assigned package ${pkg.tracking_number} for delivery.`,
      messageAr: `تم تعيين طرد ${pkg.tracking_number} لك للتوصيل.`,
      channel: 'in_app',
      data: { packageId, tripId },
    });

    return pkg;
  }
}

export const packageService = new PackageService();

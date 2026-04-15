import { z } from 'zod';

export const COMMUNICATIONS_CONTRACT_VERSION = '2026-04-15';

export const communicationPreferencesSchema = z.object({
  inApp: z.boolean(),
  push: z.boolean(),
  email: z.boolean(),
  sms: z.boolean(),
  whatsapp: z.boolean(),
  tripUpdates: z.boolean(),
  bookingRequests: z.boolean(),
  messages: z.boolean(),
  promotions: z.boolean(),
  prayerReminders: z.boolean(),
  criticalAlerts: z.boolean(),
  preferredLanguage: z.enum(['en', 'ar']),
});

export const communicationDeliveryRecordSchema = z
  .object({
    id: z.string().min(1),
    userId: z.string().min(1).optional(),
    notificationId: z.string().nullable().optional(),
    channel: z.enum(['in_app', 'push', 'email', 'sms', 'whatsapp']),
    status: z.string().min(1),
    destination: z.string().min(1),
    subject: z.string().nullable().optional(),
    body: z.string().min(1),
    metadata: z.record(z.unknown()).nullable().optional(),
    providerName: z.string().nullable().optional(),
    queuedAt: z.string().min(1),
    createdAt: z.string().optional(),
  })
  .passthrough();

export const communicationDeliveryHistorySchema = z.array(
  communicationDeliveryRecordSchema,
);

export type CommunicationPreferencesContract = z.infer<
  typeof communicationPreferencesSchema
>;
export type CommunicationDeliveryRecordContract = z.infer<
  typeof communicationDeliveryRecordSchema
>;

/**
 * GDPR Compliance Module
 * Frontend boundary: auth + backend API calls only. All data access and
 * privacy workflows execute on the backend.
 */

import { API_URL, fetchWithRetry, getAuthDetails } from '@/services/core';
import { logger } from './monitoring';
import { sanitizeLogMessage } from './sanitization';

export interface ConsentRecord {
  userId: string;
  consentType: 'terms' | 'privacy' | 'marketing' | 'analytics' | 'cookies';
  granted: boolean;
  timestamp: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface DataExportRequest {
  userId: string;
  requestedAt: number;
  completedAt?: number;
  downloadUrl?: string;
  expiresAt?: number;
}

export interface DataDeletionRequest {
  userId: string;
  requestedAt: number;
  scheduledFor: number;
  completedAt?: number;
  reason?: string;
}

async function requestBackend<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { token } = await getAuthDetails();
  const response = await fetchWithRetry(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
    timeout: 15_000,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(String(body.error ?? `Backend request failed: ${path}`));
  }

  return response.json() as Promise<T>;
}

class GDPRCompliance {
  async recordConsent(consent: ConsentRecord): Promise<void> {
    try {
      await requestBackend<{ ok: true }>('/gdpr/consents', {
        method: 'POST',
        body: JSON.stringify(consent),
      });

      logger.info('Consent recorded', {
        userId: sanitizeLogMessage(consent.userId),
        type: consent.consentType,
        granted: consent.granted,
      });
    } catch (error) {
      logger.error('Failed to record consent', error);
      throw error;
    }
  }

  async getConsent(
    userId: string,
    consentType: ConsentRecord['consentType'],
  ): Promise<boolean> {
    try {
      const result = await requestBackend<{ granted: boolean }>(
        `/gdpr/consents/${encodeURIComponent(consentType)}?userId=${encodeURIComponent(userId)}`,
      );
      return result.granted;
    } catch (error) {
      logger.error('Failed to get consent', error);
      return false;
    }
  }

  async requestDataExport(userId: string): Promise<DataExportRequest> {
    try {
      const request = await requestBackend<DataExportRequest>('/gdpr/data-exports', {
        method: 'POST',
        body: JSON.stringify({ userId }),
      });

      logger.info('Data export requested', { userId: sanitizeLogMessage(userId) });
      return request;
    } catch (error) {
      logger.error('Failed to request data export', error);
      throw error;
    }
  }

  async requestDeletion(userId: string, reason?: string): Promise<DataDeletionRequest> {
    try {
      const request = await requestBackend<DataDeletionRequest>('/gdpr/deletions', {
        method: 'POST',
        body: JSON.stringify({ userId, reason }),
      });

      logger.info('Account deletion requested', {
        userId: sanitizeLogMessage(userId),
        scheduledFor: new Date(request.scheduledFor).toISOString(),
      });

      return request;
    } catch (error) {
      logger.error('Failed to request deletion', error);
      throw error;
    }
  }

  async cancelDeletion(userId: string): Promise<void> {
    try {
      await requestBackend<{ ok: true }>('/gdpr/deletions/cancel', {
        method: 'POST',
        body: JSON.stringify({ userId }),
      });

      logger.info('Account deletion cancelled', { userId: sanitizeLogMessage(userId) });
    } catch (error) {
      logger.error('Failed to cancel deletion', error);
      throw error;
    }
  }

  async executeScheduledDeletions(): Promise<void> {
    throw new Error('Scheduled GDPR deletions are backend-only. Use gdpr-deletion-scheduler.');
  }

  async getDataProcessingActivities(userId: string): Promise<string[]> {
    const [analytics, marketing] = await Promise.all([
      this.getConsent(userId, 'analytics'),
      this.getConsent(userId, 'marketing'),
    ]);

    const activities: string[] = [];
    if (analytics) activities.push('Analytics and performance monitoring');
    if (marketing) activities.push('Marketing communications');

    activities.push('Service delivery and transaction processing');
    activities.push('Security and fraud prevention');
    activities.push('Legal compliance');

    return activities;
  }
}

export const gdpr = new GDPRCompliance();

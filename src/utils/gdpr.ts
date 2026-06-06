/**
 * GDPR Compliance Module
 * Implements data privacy and user rights under GDPR
 */

import { logger } from './monitoring';
import { sanitizeLogMessage } from './sanitization';
import { API_URL, createEdgeHeaders, fetchWithRetry, getAuthDetails } from '../services/core';

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

class GDPRCompliance {
  private async requestBackend<T>(
    path: string,
    options: RequestInit = {},
    allowAnonymous = false,
  ): Promise<T> {
    if (!API_URL) {
      throw new Error('Backend API is not configured');
    }

    const auth = allowAnonymous ? null : await getAuthDetails();
    const response = await fetchWithRetry(`${API_URL}${path}`, {
      ...options,
      headers: createEdgeHeaders(
        {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        auth?.token,
      ),
    });

    if (!response.ok) {
      throw new Error(`GDPR backend request failed: ${response.status}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  /**
   * Record user consent
   */
  async recordConsent(consent: ConsentRecord): Promise<void> {
    try {
      await this.requestBackend<void>('/privacy/consents', {
        method: 'POST',
        body: JSON.stringify({
          userId: consent.userId,
          consentType: consent.consentType,
          granted: consent.granted,
          ipAddress: consent.ipAddress,
          userAgent: consent.userAgent,
          timestamp: consent.timestamp,
        }),
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

  /**
   * Get user consent status
   */
  async getConsent(
    userId: string,
    consentType: ConsentRecord['consentType']
  ): Promise<boolean> {
    try {
      const result = await this.requestBackend<{ granted: boolean }>(
        `/privacy/consents/${encodeURIComponent(userId)}/${encodeURIComponent(consentType)}`,
      );
      return result.granted;
    } catch (error) {
      logger.error('Failed to get consent', error);
      return false;
    }
  }

  /**
   * Request data export (Right to Data Portability)
   */
  async requestDataExport(userId: string): Promise<DataExportRequest> {
    try {
      const request: DataExportRequest = {
        userId,
        requestedAt: Date.now(),
      };

      await this.requestBackend<DataExportRequest>('/privacy/data-export', {
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

  /**
   * Generate data export
   */
  private async generateDataExport(userId: string): Promise<string> {
    try {
      const result = await this.requestBackend<{ downloadUrl: string }>(
        `/privacy/data-export/${encodeURIComponent(userId)}/generate`,
        { method: 'POST' },
      );

      logger.info('Data export generated', { userId });

      return result.downloadUrl;
    } catch (error) {
      logger.error('Failed to generate data export', error);
      throw error;
    }
  }

  /**
   * Request account deletion (Right to be Forgotten)
   */
  async requestDeletion(
    userId: string,
    reason?: string
  ): Promise<DataDeletionRequest> {
    try {
      // Schedule deletion for 30 days from now (grace period)
      const scheduledFor = Date.now() + 30 * 24 * 60 * 60 * 1000;

      const request: DataDeletionRequest = {
        userId,
        requestedAt: Date.now(),
        scheduledFor,
        reason,
      };

      await this.requestBackend<DataDeletionRequest>('/privacy/deletions', {
        method: 'POST',
        body: JSON.stringify({ userId, reason }),
      });

      logger.info('Account deletion requested', {
        userId,
        scheduledFor: new Date(scheduledFor).toISOString(),
      });

      return request;
    } catch (error) {
      logger.error('Failed to request deletion', error);
      throw error;
    }
  }

  /**
   * Cancel deletion request
   */
  async cancelDeletion(userId: string): Promise<void> {
    try {
      await this.requestBackend<void>(`/privacy/deletions/${encodeURIComponent(userId)}/cancel`, {
        method: 'POST',
      });

      logger.info('Account deletion cancelled', { userId });
    } catch (error) {
      logger.error('Failed to cancel deletion', error);
      throw error;
    }
  }

  /**
   * Execute scheduled deletions (called by worker)
   */
  async executeScheduledDeletions(): Promise<void> {
    try {
      await this.requestBackend<void>('/privacy/deletions/execute-due', { method: 'POST' });
    } catch (error) {
      logger.error('Failed to execute scheduled deletions', error);
    }
  }

  /**
   * Delete all user data
   */
  private async deleteUserData(userId: string): Promise<void> {
    await this.requestBackend<void>(`/privacy/users/${encodeURIComponent(userId)}/delete`, {
      method: 'POST',
    });
  }

  /**
   * Anonymize user data in related records
   */
  private async anonymizeUserData(userId: string): Promise<void> {
    await this.requestBackend<void>(`/privacy/users/${encodeURIComponent(userId)}/anonymize`, {
      method: 'POST',
    });
  }

  /**
   * Get user's data processing activities
   */
  async getDataProcessingActivities(userId: string): Promise<string[]> {
    const activities: string[] = [];

    if (await this.getConsent(userId, 'analytics')) {
      activities.push('Analytics and performance monitoring');
    }

    if (await this.getConsent(userId, 'marketing')) {
      activities.push('Marketing communications');
    }

    activities.push('Service delivery and transaction processing');
    activities.push('Security and fraud prevention');
    activities.push('Legal compliance');

    return activities;
  }
}

// Export singleton instance
export const gdpr = new GDPRCompliance();

// Note: In production, scheduled deletions are handled by the gdpr-deletion-scheduler
// edge function. The client-side timer is disabled to prevent unnecessary API calls.

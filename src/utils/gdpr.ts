/**
 * GDPR Compliance Module
 * Implements data privacy and user rights under GDPR
 */

import { logger } from './monitoring';
import { supabase } from './supabase/client';

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
  /**
   * Record user consent
   */
  async recordConsent(consent: ConsentRecord): Promise<void> {
    try {
      if (!supabase) {
        throw new Error('Supabase not initialized');
      }

      const { error } = await supabase.from('user_consents').insert({
        user_id: consent.userId,
        consent_type: consent.consentType,
        granted: consent.granted,
        ip_address: consent.ipAddress,
        user_agent: consent.userAgent,
        created_at: new Date(consent.timestamp).toISOString(),
      });

      if (error) throw error;

      logger.info('Consent recorded', {
        userId: consent.userId,
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
      if (!supabase) {
        return false;
      }

      const { data, error } = await supabase
        .from('user_consents')
        .select('granted')
        .eq('user_id', userId)
        .eq('consent_type', consentType)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return data?.granted ?? false;
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
      if (!supabase) {
        throw new Error('Supabase not initialized');
      }

      const request: DataExportRequest = {
        userId,
        requestedAt: Date.now(),
      };

      // Store request
      const { error } = await supabase.from('data_export_requests').insert({
        user_id: userId,
        requested_at: new Date(request.requestedAt).toISOString(),
        status: 'pending',
      });

      if (error) throw error;

      logger.info('Data export requested', { userId });

      // Trigger async export job (would be handled by worker)
      this.generateDataExport(userId).catch((error) => {
        logger.error('Data export generation failed', error);
      });

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
      if (!supabase) {
        throw new Error('Supabase not initialized');
      }

      // Collect all user data
      const [profile, bookings, packages, transactions, consents] = await Promise.all([
        supabase.from('users').select('*').eq('id', userId).single(),
        supabase.from('ride_bookings').select('*').eq('passenger_id', userId),
        supabase.from('packages').select('*').eq('sender_id', userId),
        supabase.from('wallet_transactions').select('*').eq('user_id', userId),
        supabase.from('user_consents').select('*').eq('user_id', userId),
      ]);

      const exportData = {
        exportDate: new Date().toISOString(),
        userId,
        profile: profile.data,
        bookings: bookings.data,
        packages: packages.data,
        transactions: transactions.data,
        consents: consents.data,
      };

      // Convert to JSON
      const jsonData = JSON.stringify(exportData, null, 2);
      
      // In production, upload to secure storage and return URL
      // For now, return data URL
      const dataUrl = `data:application/json;base64,${btoa(jsonData)}`;

      // Update request with download URL
      await supabase
        .from('data_export_requests')
        .update({
          status: 'completed',
          download_url: dataUrl,
          completed_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        })
        .eq('user_id', userId)
        .eq('status', 'pending');

      logger.info('Data export generated', { userId });

      return dataUrl;
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
      if (!supabase) {
        throw new Error('Supabase not initialized');
      }

      // Schedule deletion for 30 days from now (grace period)
      const scheduledFor = Date.now() + 30 * 24 * 60 * 60 * 1000;

      const request: DataDeletionRequest = {
        userId,
        requestedAt: Date.now(),
        scheduledFor,
        reason,
      };

      // Store request
      const { error } = await supabase.from('data_deletion_requests').insert({
        user_id: userId,
        requested_at: new Date(request.requestedAt).toISOString(),
        scheduled_for: new Date(scheduledFor).toISOString(),
        reason,
        status: 'pending',
      });

      if (error) throw error;

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
      if (!supabase) {
        throw new Error('Supabase not initialized');
      }

      const { error } = await supabase
        .from('data_deletion_requests')
        .update({ status: 'cancelled' })
        .eq('user_id', userId)
        .eq('status', 'pending');

      if (error) throw error;

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
      if (!supabase) {
        throw new Error('Supabase not initialized');
      }

      // Find pending deletions that are due
      const { data: requests, error } = await supabase
        .from('data_deletion_requests')
        .select('user_id')
        .eq('status', 'pending')
        .lte('scheduled_for', new Date().toISOString());

      if (error) throw error;

      if (!requests || requests.length === 0) {
        return;
      }

      // Process each deletion
      for (const request of requests) {
        try {
          await this.deleteUserData(request.user_id);
          
          // Mark as completed
          await supabase
            .from('data_deletion_requests')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
            })
            .eq('user_id', request.user_id);

          logger.info('User data deleted', { userId: request.user_id });
        } catch (error) {
          logger.error('Failed to delete user data', {
            userId: request.user_id,
            error,
          });
        }
      }
    } catch (error) {
      logger.error('Failed to execute scheduled deletions', error);
    }
  }

  /**
   * Delete all user data
   */
  private async deleteUserData(userId: string): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase not initialized');
    }

    // Soft delete user data
    await Promise.all([
      supabase
        .from('users')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', userId),
      supabase
        .from('ride_bookings')
        .update({ deleted_at: new Date().toISOString() })
        .eq('passenger_id', userId),
      supabase
        .from('packages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('sender_id', userId),
      supabase
        .from('wallet_transactions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('user_id', userId),
    ]);

    // Anonymize remaining references
    await this.anonymizeUserData(userId);
  }

  /**
   * Anonymize user data in related records
   */
  private async anonymizeUserData(userId: string): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase not initialized');
    }

    const anonymousEmail = `deleted-${userId.slice(0, 8)}@wasel.local`;
    const anonymousName = 'Deleted User';

    await supabase
      .from('users')
      .update({
        email: anonymousEmail,
        full_name: anonymousName,
        phone_number: `deleted-${userId.slice(0, 8)}`,
        avatar_url: null,
      })
      .eq('id', userId);
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

// Schedule deletion execution (in production, this would be a worker)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    gdpr.executeScheduledDeletions().catch((error) => {
      logger.error('Scheduled deletion execution failed', error);
    });
  }, 24 * 60 * 60 * 1000); // Daily
}

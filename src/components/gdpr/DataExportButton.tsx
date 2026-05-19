/**
 * GDPR Data Export Button
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner';

export function DataExportButton() {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.rpc('request_data_export', {
        p_user_id: user.id,
      });

      if (error) throw error;

      toast.success('Data export requested', {
        description: 'You will receive an email with your data within 24 hours.',
      });
    } catch (error) {
      toast.error('Export failed', {
        description: error instanceof Error ? error.message : 'Failed to request data export',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleExport} disabled={loading} variant="outline">
      {loading ? 'Requesting...' : 'Export My Data'}
    </Button>
  );
}

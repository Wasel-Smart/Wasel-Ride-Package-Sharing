import { supabase } from '../../services/core';

export function subscribeToMobilityCorridorChanges(onChange: () => void): () => void {
  const client = supabase;
  if (!client) {
    return () => undefined;
  }

  const channel = client
    .channel('mobility-os-server-state')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'mobility_corridors' }, onChange)
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}


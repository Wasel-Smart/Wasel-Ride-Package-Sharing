import { supabase } from '../../services/core';

export function subscribeToMobilityCorridorChanges(onChange: () => void): () => void {
  if (!supabase) {
    return () => undefined;
  }

  const channel = supabase
    .channel('mobility-os-server-state')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'mobility_corridors' }, onChange)
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}


import { create } from 'zustand';

interface ConnectionState {
  isOnline: boolean;
  syncInProgress: boolean;
  queueSize: number;
  cacheSize: number;
  lastSyncAt: string | null;
}

interface ConnectionActions {
  setOnline: (online: boolean) => void;
  setSyncInProgress: (inProgress: boolean) => void;
  setQueueSize: (size: number) => void;
  setCacheSize: (size: number) => void;
  setLastSyncAt: (timestamp: string | null) => void;
  reset: () => void;
}

const initialState: ConnectionState = {
  isOnline: true,
  syncInProgress: false,
  queueSize: 0,
  cacheSize: 0,
  lastSyncAt: null,
};

export const useConnectionStore = create<ConnectionState & ConnectionActions>(set => ({
  ...initialState,
  setOnline: isOnline => set({ isOnline }),
  setSyncInProgress: syncInProgress => set({ syncInProgress }),
  setQueueSize: queueSize => set({ queueSize }),
  setCacheSize: cacheSize => set({ cacheSize }),
  setLastSyncAt: lastSyncAt => set({ lastSyncAt }),
  reset: () => set(initialState),
}));

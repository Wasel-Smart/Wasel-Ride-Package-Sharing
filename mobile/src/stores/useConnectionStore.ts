import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';

// Use a dedicated MMKV instance so connection state survives app restarts
// without polluting the offline queue storage.
const mmkv = new MMKV({ id: 'wasel-connection-store' });

const mmkvStorage = {
  getItem: (name: string): string | null => mmkv.getString(name) ?? null,
  setItem: (name: string, value: string): void => { mmkv.set(name, value); },
  removeItem: (name: string): void => { mmkv.delete(name); },
};

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

export const useConnectionStore = create<ConnectionState & ConnectionActions>()(
  persist(
    set => ({
      ...initialState,
      setOnline: isOnline => set({ isOnline }),
      setSyncInProgress: syncInProgress => set({ syncInProgress }),
      setQueueSize: queueSize => set({ queueSize }),
      setCacheSize: cacheSize => set({ cacheSize }),
      setLastSyncAt: lastSyncAt => set({ lastSyncAt }),
      reset: () => set(initialState),
    }),
    {
      name: 'connection-store',
      storage: createJSONStorage(() => mmkvStorage),
      // Only persist the queue/cache sizes and last sync time.
      // isOnline and syncInProgress are runtime state — always reset to defaults.
      partialize: (state) => ({
        queueSize: state.queueSize,
        cacheSize: state.cacheSize,
        lastSyncAt: state.lastSyncAt,
      }),
    },
  ),
);

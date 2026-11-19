import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';

const mmkv = new MMKV({ id: 'wasel-app-store' });

const mmkvStorage = {
  getItem: (name: string): string | null => mmkv.getString(name) ?? null,
  setItem: (name: string, value: string): void => { mmkv.set(name, value); },
  removeItem: (name: string): void => { mmkv.delete(name); },
};

interface AppState {
  activeBottomSheet: string | null;
  previousRoute: string | null;
  unreadNotificationsCount: number;
}

interface AppActions {
  openBottomSheet: (id: string) => void;
  closeBottomSheet: () => void;
  setPreviousRoute: (route: string | null) => void;
  setUnreadNotificationsCount: (count: number) => void;
}

export const useAppStore = create<AppState & AppActions>()(
  persist(
    set => ({
      activeBottomSheet: null,
      previousRoute: null,
      unreadNotificationsCount: 0,
      openBottomSheet: id => set({ activeBottomSheet: id }),
      closeBottomSheet: () => set({ activeBottomSheet: null }),
      setPreviousRoute: previousRoute => set({ previousRoute }),
      setUnreadNotificationsCount: unreadNotificationsCount => set({ unreadNotificationsCount }),
    }),
    {
      name: 'app-store',
      storage: createJSONStorage(() => mmkvStorage),
      // Only persist the notification badge count. Bottom sheet and route are session state.
      partialize: (state) => ({
        unreadNotificationsCount: state.unreadNotificationsCount,
      }),
    },
  ),
);

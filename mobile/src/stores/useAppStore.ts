import { create } from 'zustand';

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

export const useAppStore = create<AppState & AppActions>(set => ({
  activeBottomSheet: null,
  previousRoute: null,
  unreadNotificationsCount: 0,
  openBottomSheet: id => set({ activeBottomSheet: id }),
  closeBottomSheet: () => set({ activeBottomSheet: null }),
  setPreviousRoute: previousRoute => set({ previousRoute }),
  setUnreadNotificationsCount: unreadNotificationsCount => set({ unreadNotificationsCount }),
}));

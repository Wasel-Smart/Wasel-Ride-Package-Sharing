import { useAppStore } from './useAppStore';

describe('useAppStore', () => {
  afterEach(() => {
    useAppStore.getState().closeBottomSheet();
    useAppStore.getState().setPreviousRoute(null);
    useAppStore.getState().setUnreadNotificationsCount(0);
  });

  it('opens and closes the bottom sheet', () => {
    expect(useAppStore.getState().activeBottomSheet).toBeNull();
    useAppStore.getState().openBottomSheet('share');
    expect(useAppStore.getState().activeBottomSheet).toBe('share');
    useAppStore.getState().closeBottomSheet();
    expect(useAppStore.getState().activeBottomSheet).toBeNull();
  });

  it('tracks the previous route', () => {
    useAppStore.getState().setPreviousRoute('Home');
    expect(useAppStore.getState().previousRoute).toBe('Home');
  });

  it('updates the unread notifications count', () => {
    useAppStore.getState().setUnreadNotificationsCount(5);
    expect(useAppStore.getState().unreadNotificationsCount).toBe(5);
  });
});

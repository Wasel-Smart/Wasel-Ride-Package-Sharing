import { describe, it, expect, afterEach } from '@jest/globals';
import { useAppStore } from './useAppStore';

describe('useAppStore', () => {
  afterEach(() => {
    useAppStore.getState().closeBottomSheet();
    useAppStore.getState().setPreviousRoute(null);
    useAppStore.getState().setUnreadNotificationsCount(0);
  });

  it('starts with default state', () => {
    expect(useAppStore.getState().activeBottomSheet).toBeNull();
    expect(useAppStore.getState().previousRoute).toBeNull();
    expect(useAppStore.getState().unreadNotificationsCount).toBe(0);
  });

  it('opens and closes the bottom sheet', () => {
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

  it('can overwrite previous bottom sheet', () => {
    useAppStore.getState().openBottomSheet('share');
    useAppStore.getState().openBottomSheet('filter');
    expect(useAppStore.getState().activeBottomSheet).toBe('filter');
    useAppStore.getState().closeBottomSheet();
    expect(useAppStore.getState().activeBottomSheet).toBeNull();
  });
});

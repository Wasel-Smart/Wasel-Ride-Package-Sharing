/**
 * ProfilePageSurface
 *
 * Thin wrapper so the barrel can export `ProfilePage` without
 * pulling the full ProfilePageSurface module into AppSurfaces.
 */
import ProfilePageSurface from '../../../features/profile/ProfilePage';

export function ProfilePage() {
  return <ProfilePageSurface />;
}

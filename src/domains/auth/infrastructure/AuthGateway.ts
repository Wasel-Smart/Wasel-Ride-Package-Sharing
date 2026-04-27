import { authAPI } from '@/services/auth';

export class AuthGateway {
  signIn(email: string, password: string) {
    return authAPI.signIn(email, password);
  }

  signOut() {
    return authAPI.signOut();
  }

  signUp(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    phone?: string,
  ) {
    return authAPI.signUp(email, password, firstName, lastName, phone);
  }

  getProfile() {
    return authAPI.getProfile();
  }
}

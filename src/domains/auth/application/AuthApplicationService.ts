import { createDomainEvent, publishDomainEvent } from '@/platform';
import { AUTH_DOMAIN_EVENTS } from '../domain/events';
import { AuthGateway } from '../infrastructure/AuthGateway';

class AuthApplicationService {
  constructor(private readonly gateway: AuthGateway) {}

  async signIn(email: string, password: string) {
    const result = await this.gateway.signIn(email, password);
    await publishDomainEvent(createDomainEvent({
      name: AUTH_DOMAIN_EVENTS.signedIn,
      domain: 'auth',
      payload: {
        email,
        userId: result.user?.id ?? result.session?.user?.id,
      },
    }));
    return result;
  }

  async signUp(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    phone?: string,
  ) {
    const result = await this.gateway.signUp(email, password, firstName, lastName, phone);
    await publishDomainEvent(createDomainEvent({
      name: result.session?.user
        ? AUTH_DOMAIN_EVENTS.signedUp
        : AUTH_DOMAIN_EVENTS.verificationRequested,
      domain: 'auth',
      payload: {
        email,
        requiresEmailConfirmation: !result.session?.user,
        userId: result.user?.id ?? result.session?.user?.id,
      },
    }));
    return result;
  }

  async signOut() {
    await this.gateway.signOut();
    await publishDomainEvent(createDomainEvent({
      name: AUTH_DOMAIN_EVENTS.signedOut,
      domain: 'auth',
      payload: {},
    }));
  }
}

export const authApplicationService = new AuthApplicationService(new AuthGateway());

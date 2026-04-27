import { createDomainEvent, publishDomainEvent } from '@/platform';
import { WALLET_DOMAIN_EVENTS } from '../domain/events';
import { WalletGateway } from '../infrastructure/WalletGateway';

class WalletApplicationService {
  constructor(private readonly gateway: WalletGateway) {}

  async createPaymentIntent(...args: Parameters<WalletGateway['createPaymentIntent']>) {
    const intent = await this.gateway.createPaymentIntent(...args);
    await publishDomainEvent(createDomainEvent({
      name: WALLET_DOMAIN_EVENTS.paymentAuthorized,
      domain: 'wallet',
      payload: {
        paymentIntentId: intent.id,
        amount: intent.amount,
        purpose: intent.purpose,
      },
    }));
    return intent;
  }

  async confirmPaymentIntent(...args: Parameters<WalletGateway['confirmPaymentIntent']>) {
    const result = await this.gateway.confirmPaymentIntent(...args);
    await publishDomainEvent(createDomainEvent({
      name: WALLET_DOMAIN_EVENTS.paymentConfirmed,
      domain: 'wallet',
      payload: {
        paymentIntentId: result.id,
        settled: result.settled,
        status: result.status,
      },
    }));
    return result;
  }

  async verifyPin(...args: Parameters<WalletGateway['verifyPin']>) {
    const verification = await this.gateway.verifyPin(...args);
    if (verification.verified) {
      await publishDomainEvent(createDomainEvent({
        name: WALLET_DOMAIN_EVENTS.stepUpVerified,
        domain: 'wallet',
        payload: {
          purpose: verification.purpose,
        },
      }));
    }
    return verification;
  }
}

export const walletApplicationService = new WalletApplicationService(new WalletGateway());

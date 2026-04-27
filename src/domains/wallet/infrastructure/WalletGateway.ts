import {
  walletApi,
  type AddPaymentMethodInput,
} from '@/services/walletApi';

export class WalletGateway {
  confirmPaymentIntent(paymentIntentId: string, paymentMethodId?: string) {
    return walletApi.confirmPaymentIntent(paymentIntentId, paymentMethodId);
  }

  createPaymentIntent(
    ...args: Parameters<typeof walletApi.createPaymentIntent>
  ) {
    return walletApi.createPaymentIntent(...args);
  }

  getWalletSnapshot(userId?: string) {
    return walletApi.getWalletSnapshot(userId);
  }

  sendMoney(recipientUserId: string, amount: number, note?: string) {
    return walletApi.sendMoney(recipientUserId, amount, note);
  }

  verifyPin(
    pin: string,
    purpose: Parameters<typeof walletApi.verifyPin>[1],
    otpCode?: string,
    challengeId?: string,
  ) {
    return walletApi.verifyPin(pin, purpose, otpCode, challengeId);
  }

  addPaymentMethod(input: AddPaymentMethodInput) {
    return walletApi.addPaymentMethod(input);
  }
}

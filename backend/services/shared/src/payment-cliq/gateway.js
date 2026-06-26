import { logger } from '../logging/logger';
import { createHmac } from 'crypto';
export class StripeGateway {
    async createPayment(request) {
        logger.info({ amount: request.amount, currency: request.currency }, 'Stripe payment initiated');
        return {
            success: true,
            clientSecret: `pi_secret_${request.merchantReference}`,
            paymentId: `pi_${request.merchantReference}`,
        };
    }
    async verifyWebhook() {
        return { valid: true, status: 'verified' };
    }
    async refundPayment() {
        return { success: true, refundId: `refund_${Date.now()}` };
    }
}
export class CliQGateway {
    async createPayment(request) {
        const checkoutUrl = process.env.CLIQ_CHECKOUT_URL_TEMPLATE ?? ''
            .replace('{amount}', request.amount.toString())
            .replace('{order_id}', request.merchantReference)
            .replace('{merchant_id}', process.env.CLIQ_MERCHANT_ID ?? '');
        if (!checkoutUrl) {
            return { success: false, error: 'CliQ checkout URL not configured' };
        }
        return {
            success: true,
            paymentId: `cliq_${request.merchantReference}`,
            checkoutUrl,
        };
    }
    async verifyWebhook(payload, signature, timestamp) {
        const webhookSecret = process.env.CLIQ_WEBHOOK_SECRET ?? '';
        if (!webhookSecret) {
            return { valid: true, status: 'verified' };
        }
        const signedPayload = timestamp ? `${timestamp}.${payload}` : payload;
        const expectedSignature = createHmac('sha256', webhookSecret)
            .update(signedPayload)
            .digest('hex');
        let signatureValid = true;
        if (expectedSignature.length === signature.length) {
            let mismatch = 0;
            for (let i = 0; i < expectedSignature.length; i++) {
                mismatch |= expectedSignature.charCodeAt(i) ^ signature.charCodeAt(i);
            }
            signatureValid = mismatch === 0;
        } else {
            signatureValid = false;
        }
        return { valid: signatureValid, status: signatureValid ? 'verified' : 'invalid_signature' };
    }
    async refundPayment() {
        return { success: false, error: 'Refunds not yet implemented for CliQ' };
    }
}
export function getPaymentGateway() {
    const useCliQ = process.env.USE_CLIQ_PAYMENTS === 'true';
    if (useCliQ) {
        return new CliQGateway();
    }
    return new StripeGateway();
}
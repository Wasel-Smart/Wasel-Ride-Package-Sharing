import { useCallback, useState } from 'react';
import { walletApi } from '../../../services/walletApi';
import { logger } from '../../../utils/monitoring';
import { sanitizeLogMessage } from '../../../utils/sanitization';

export function usePayment() {
    const [paymentInFlight, setPaymentInFlight] = useState(false);
    const [paymentError, setPaymentError] = useState<string | null>(null);

    const capturePayment = useCallback(async (userId: string, amount: number, bookingId: string, metadata: Record<string, unknown>) => {
        setPaymentInFlight(true);
        setPaymentError(null);

        try {
            await walletApi.pay(userId, amount, 'ride_booking', bookingId, metadata);
            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Payment could not be processed.';
            logger.error('Ride booking payment failed', error, { bookingId: sanitizeLogMessage(bookingId), amount, userId: sanitizeLogMessage(userId) });
            setPaymentError(message);
            return false;
        } finally {
            setPaymentInFlight(false);
        }
    }, []);

    return { paymentInFlight, paymentError, capturePayment };
}

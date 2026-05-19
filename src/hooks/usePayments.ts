import { useState, useCallback } from 'react';
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import { paymentService, PaymentIntentRequest } from '@/services/payment';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export function usePayments() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stripe, setStripe] = useState<Stripe | null>(null);

  const initializeStripe = useCallback(async () => {
    const stripeInstance = await stripePromise;
    setStripe(stripeInstance);
    return stripeInstance;
  }, []);

  const createPaymentIntent = useCallback(async (request: PaymentIntentRequest) => {
    setLoading(true);
    setError(null);

    try {
      const response = await paymentService.createPaymentIntent(request);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const confirmPayment = useCallback(
    async (_clientSecret: string, elements: StripeElements, returnUrl?: string) => {
      if (!stripe) {
        throw new Error('Stripe not initialized');
      }

      setLoading(true);
      setError(null);

      try {
        const { error: confirmError } = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: returnUrl || `${window.location.origin}/app/bookings`,
          },
        });

        if (confirmError) {
          setError(confirmError.message || 'Payment confirmation failed');
          throw confirmError;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Payment confirmation failed';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [stripe],
  );

  const processRefund = useCallback(async (bookingId: string, reason: string, amount?: number) => {
    setLoading(true);
    setError(null);

    try {
      const response = await paymentService.processRefund({
        bookingId,
        reason,
        amount,
      });
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Refund failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    stripe,
    loading,
    error,
    initializeStripe,
    createPaymentIntent,
    confirmPayment,
    processRefund,
  };
}

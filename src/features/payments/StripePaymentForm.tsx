import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, ShieldCheck } from 'lucide-react';
import type { Stripe, StripeElements, StripePaymentElement } from '@stripe/stripe-js';
import { Button } from '../../components/ui/button';
import { getStripeClient, getStripeReturnUrl } from './stripeClient';

interface StripePaymentFormProps {
  amount: number;
  currency: string;
  clientSecret: string;
  disabled?: boolean;
  onCompleted: (result: { paymentIntentId: string | null; status: string }) => Promise<void> | void;
  onError: (message: string) => void;
}

type MountState = 'loading' | 'ready' | 'error';

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-JO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function StripePaymentForm({
  amount,
  currency,
  clientSecret,
  disabled = false,
  onCompleted,
  onError,
}: StripePaymentFormProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stripeRef = useRef<Stripe | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);
  const paymentElementRef = useRef<StripePaymentElement | null>(null);
  const onCompletedRef = useRef(onCompleted);
  const onErrorRef = useRef(onError);
  const [mountState, setMountState] = useState<MountState>('loading');
  const [submitting, setSubmitting] = useState(false);
  const [elementError, setElementError] = useState<string | null>(null);

  useEffect(() => {
    onCompletedRef.current = onCompleted;
  }, [onCompleted]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    let active = true;
    setMountState('loading');
    setElementError(null);

    void getStripeClient()
      .then((stripe) => {
        if (!active) {
          return;
        }
        if (!stripe) {
          throw new Error('Stripe publishable key is not configured for this app.');
        }
        if (!containerRef.current) {
          throw new Error('Card entry container is unavailable.');
        }

        const elements = stripe.elements({
          clientSecret,
          appearance: {
            theme: 'night',
            variables: {
              colorPrimary: '#47B7E6',
              colorBackground: '#071323',
              colorText: '#EFF6FF',
              colorDanger: '#FB7185',
              borderRadius: '16px',
            },
          },
        });

        const paymentElement = elements.create('payment', {
          layout: {
            type: 'tabs',
            defaultCollapsed: false,
          },
        });

        paymentElement.on('ready', () => {
          if (active) {
            setMountState('ready');
          }
        });

        paymentElement.on('change', (event) => {
          if (!active) {
            return;
          }
          if (event.complete) {
            setElementError(null);
          }
        });

        paymentElement.mount(containerRef.current);
        stripeRef.current = stripe;
        elementsRef.current = elements;
        paymentElementRef.current = paymentElement;
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        const message =
          error instanceof Error ? error.message : 'Secure card entry could not be initialised.';
        setMountState('error');
        setElementError(message);
        onErrorRef.current(message);
      });

    return () => {
      active = false;
      paymentElementRef.current?.destroy();
      paymentElementRef.current = null;
      elementsRef.current = null;
      stripeRef.current = null;
    };
  }, [clientSecret]);

  async function handleSubmit() {
    const stripe = stripeRef.current;
    const elements = elementsRef.current;
    if (!stripe || !elements) {
      const message = 'Secure card entry is still loading. Please wait a moment and try again.';
      setElementError(message);
      onErrorRef.current(message);
      return;
    }

    setSubmitting(true);
    setElementError(null);

    try {
      const submitted = await elements.submit();
      if (submitted.error) {
        throw new Error(submitted.error.message ?? 'Please complete the card form before paying.');
      }

      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: getStripeReturnUrl(),
        },
        redirect: 'if_required',
      });

      if (result.error) {
        throw new Error(result.error.message ?? 'Stripe could not confirm this payment.');
      }

      await onCompletedRef.current({
        paymentIntentId: result.paymentIntent?.id ?? null,
        status: result.paymentIntent?.status ?? 'processing',
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Stripe could not confirm this payment.';
      setElementError(message);
      onErrorRef.current(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-primary/15 bg-white/5 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl border border-primary/20 bg-primary/10 p-2 text-primary">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">Secure card checkout</p>
          <p className="text-xs leading-5 text-muted-foreground">
            Stripe will encrypt the card details. This payment is authorising{' '}
            {formatCurrency(amount, currency)}.
          </p>
        </div>
      </div>

      <div
        ref={containerRef}
        className="min-h-28 rounded-2xl border border-white/10 bg-[#071323] p-3"
      />

      {mountState === 'loading' ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Loading secure card form...
        </div>
      ) : null}

      {elementError ? (
        <div className="rounded-2xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
          {elementError}
        </div>
      ) : null}

      <Button
        className="w-full"
        disabled={disabled || submitting || mountState !== 'ready'}
        onClick={handleSubmit}
      >
        {submitting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
        Pay with Stripe
      </Button>
    </div>
  );
}

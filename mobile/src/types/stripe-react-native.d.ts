declare module '@stripe/stripe-react-native' {
  import type { ReactNode } from 'react';

  export function StripeProvider(props: {
    publishableKey: string;
    merchantIdentifier?: string;
    urlScheme?: string;
    children?: ReactNode;
  }): JSX.Element;

  export function useStripe(): {
    initPaymentSheet(input: {
      merchantDisplayName: string;
      paymentIntentClientSecret: string;
      allowsDelayedPaymentMethods?: boolean;
      defaultBillingDetails?: {
        address?: {
          country?: string;
        };
      };
    }): Promise<{ error?: { message: string } }>;
    presentPaymentSheet(): Promise<{ error?: { message: string } }>;
  };
}

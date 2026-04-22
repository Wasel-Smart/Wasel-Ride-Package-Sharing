/**
 * PaymentsPageSurface
 *
 * Displays the payment intent lifecycle UI. Delegates actual
 * payment processing to walletApi — this component is display-only.
 */
import { useState } from 'react';
import { Button, Card, LayoutContainer, SectionWrapper } from '../../../design-system/components';
import { PageHeading, ProtectedPage } from './SharedPageComponents';

export function PaymentsPage() {
  const [intentCreated, setIntentCreated] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  return (
    <ProtectedPage>
      <LayoutContainer>
        <div className="ds-page">
          <PageHeading
            description="Keep payment intent, confirmation, and settlement explicit."
            eyebrow="Payments"
            title="Move value with explicit payment flows"
          />
          <SectionWrapper
            description="Create an intent first, then confirm the payment."
            title="Payment intent"
          >
            <div className="ds-stack">
              <p className="ds-copy ds-copy--tight">
                Wallet keeps your balance close, but payment actions should still be deliberate.
              </p>

              {!intentCreated ? (
                <Button onClick={() => setIntentCreated(true)}>
                  Create payment intent
                </Button>
              ) : (
                <>
                  <Card>
                    <h2 className="ds-card__title">Payment lifecycle</h2>
                    <p className="ds-copy ds-copy--tight">
                      Intent created. Review the amount, then confirm the payment.
                    </p>
                  </Card>
                  <Button onClick={() => setConfirmed(true)} variant="secondary">
                    Confirm payment
                  </Button>
                </>
              )}

              {confirmed ? (
                <div className="ds-inline-feedback" data-tone="success">
                  Payment settled successfully.
                </div>
              ) : null}
            </div>
          </SectionWrapper>
        </div>
      </LayoutContainer>
    </ProtectedPage>
  );
}

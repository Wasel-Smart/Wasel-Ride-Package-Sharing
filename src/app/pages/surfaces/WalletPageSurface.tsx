/**
 * WalletPageSurface
 *
 * Displays the user's stored-value summary and primary wallet actions.
 * Business logic is handled by walletApi; this component is display-only.
 */
import { Button, Card, LayoutContainer, SectionWrapper } from '../../../design-system/components';
import { useLocalAuth } from '../../../contexts/LocalAuth';
import { MetricGrid, PageHeading, ProtectedPage } from './SharedPageComponents';

export function WalletPage() {
  const { user } = useLocalAuth();

  return (
    <ProtectedPage>
      <LayoutContainer>
        <div className="ds-page">
          <PageHeading
            description="Stored value now uses the same direct Wasel language."
            eyebrow="Wallet"
            title="Wallet"
          />
          <MetricGrid
            items={[
              { label: 'Balance',     value: `${user?.balance ?? 0} JOD`, detail: 'Available stored value.' },
              { label: 'Trust score', value: String(user?.trustScore ?? 0), detail: 'Account readiness.' },
              { label: 'Trips',       value: String(user?.trips ?? 0), detail: 'Journey history on this account.' },
              { label: 'Status',      value: user?.walletStatus ?? 'active', detail: 'Wallet health.' },
            ]}
          />
          <SectionWrapper
            description="One primary money surface, three quick actions."
            title="Stored-value controls"
          >
            <div className="ds-action-grid">
              <Card>
                <h2 className="ds-card__title">Add money</h2>
                <p className="ds-copy ds-copy--tight">Top up before the next ride or package move.</p>
                <Button>Add money</Button>
              </Card>
              <Card>
                <h2 className="ds-card__title">Withdraw</h2>
                <p className="ds-copy ds-copy--tight">Move available value out when you need it.</p>
                <Button variant="secondary">Withdraw</Button>
              </Card>
              <Card>
                <h2 className="ds-card__title">Send</h2>
                <p className="ds-copy ds-copy--tight">Transfer value inside the same account system.</p>
                <Button variant="ghost">Send</Button>
              </Card>
            </div>
          </SectionWrapper>
        </div>
      </LayoutContainer>
    </ProtectedPage>
  );
}

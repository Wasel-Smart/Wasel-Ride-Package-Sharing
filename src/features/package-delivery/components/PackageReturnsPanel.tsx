import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { DS } from '../../../features/shared/pageShared';
import { SectionCard } from '../../../components/wasel-ui/WaselPagePrimitives';
import { WaselButton, WaselInput, WaselSelect } from '../../../components/wasel-ui';

export function PackageReturnsPanel() {
  const [orderId, setOrderId] = useState('');
  const [reason, setReason] = useState('');

  return (
    <SectionCard
      title="Return a Package"
      subtitle="Initiate a return for a delivered package."
      icon={<RotateCcw size={18} color={DS.gold} />}
    >
      <div style={{ display: 'grid', gap: 16 }}>
        <div>
          <label style={{ fontSize: '0.7rem', color: DS.muted, fontWeight: 700 }}>Order ID</label>
          <WaselInput value={orderId} onChange={setOrderId} placeholder="PKG-XXXXX" />
        </div>
        <div>
          <label style={{ fontSize: '0.7rem', color: DS.muted, fontWeight: 700 }}>Return Reason</label>
          <WaselSelect
            value={reason}
            onChange={setReason}
            options={[{ value: 'Wrong item', label: 'Wrong item' }, { value: 'Damaged', label: 'Damaged' }, { value: 'Not as described', label: 'Not as described' }, { value: 'Other', label: 'Other' }]}
          />
        </div>
        <WaselButton>Request Return</WaselButton>
      </div>
    </SectionCard>
  );
}

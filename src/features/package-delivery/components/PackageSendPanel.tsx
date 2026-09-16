import { useState } from 'react';
import { Package } from 'lucide-react';
import { DS } from '../../../features/shared/pageShared';
import { SectionCard } from '../../../components/wasel-ui/WaselPagePrimitives';
import { WaselButton, WaselInput, WaselSelect } from '../../../components/wasel-ui';

export function PackageSendPanel({ onSubmit }: { onSubmit?: (data: PackageSendData) => void }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [weight, setWeight] = useState('<1 kg');
  const [note, setNote] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');

  const handleSubmit = async () => {
    const data: PackageSendData = { from, to, weight, note, senderName, senderPhone };
    onSubmit?.(data);
  };

  return (
    <SectionCard
      title="Send a Package"
      subtitle="Send packages with trusted travelers across Jordan."
      icon={<Package size={18} color={DS.green} />}
    >
      <div style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: '0.7rem', color: DS.muted, fontWeight: 700 }}>From</label>
            <WaselInput value={from} onChange={setFrom} placeholder="Amman" />
          </div>
          <div>
            <label style={{ fontSize: '0.7rem', color: DS.muted, fontWeight: 700 }}>To</label>
            <WaselInput value={to} onChange={setTo} placeholder="Aqaba" />
          </div>
        </div>
        <div>
          <label style={{ fontSize: '0.7rem', color: DS.muted, fontWeight: 700 }}>Sender Name</label>
          <WaselInput value={senderName} onChange={setSenderName} />
        </div>
        <div>
          <label style={{ fontSize: '0.7rem', color: DS.muted, fontWeight: 700 }}>Sender Phone</label>
          <WaselInput value={senderPhone} onChange={setSenderPhone} placeholder="+962790000000" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: '0.7rem', color: DS.muted, fontWeight: 700 }}>Weight</label>
            <WaselSelect
              value={weight}
              onChange={setWeight}
              options={[{ value: '<1 kg', label: '<1 kg' }, { value: '1-5 kg', label: '1-5 kg' }, { value: '5-10 kg', label: '5-10 kg' }, { value: '10+ kg', label: '10+ kg' }]}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.7rem', color: DS.muted, fontWeight: 700 }}>Notes</label>
            <WaselInput value={note} onChange={setNote} placeholder="Package details" />
          </div>
        </div>
        <WaselButton onClick={handleSubmit} fullWidth>
          Send Package
        </WaselButton>
      </div>
    </SectionCard>
  );
}

interface PackageSendData {
  from: string;
  to: string;
  weight: string;
  note: string;
  senderName: string;
  senderPhone: string;
}

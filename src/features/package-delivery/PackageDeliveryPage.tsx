/**
 * Package Delivery Feature
 *
 * Corridor-based package handoff logistics: send, track, and manage
 * package deliveries alongside rides through the Wasel network.
 */
import { useState } from 'react';
import { Package, Send, MapPin, Clock } from 'lucide-react';
import { tx } from '../../locales/tx';
import { PageShell } from '../../components/wasel-ui/WaselPagePrimitives';
import { PackageTrackPanel } from './components/PackageTrackPanel';
import { PackageSendPanel } from './components/PackageSendPanel';
import { PackageReturnsPanel } from './components/PackageReturnsPanel';

export function PackageDeliveryPage() {
  const [activeTab, setActiveTab] = useState<'send' | 'track' | 'returns'>('send');

  return (
    <PageShell
      title={tx('package.pageTitle')}
      subtitle={tx('package.pageSubtitle')}
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button
          type="button"
          onClick={() => setActiveTab('send')}
          className={activeTab === 'send' ? 'tab-active' : 'tab-inactive'}
        >
          {tx('package.sendTab')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('track')}
          className={activeTab === 'track' ? 'tab-active' : 'tab-inactive'}
        >
          {tx('package.trackTab')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('returns')}
          className={activeTab === 'returns' ? 'tab-active' : 'tab-inactive'}
        >
          {tx('package.returnsTab')}
        </button>
      </div>

      {activeTab === 'send' && (
        <PackageSendPanel
          onSubmit={async (data) => {
            void data;
          }}
        />
      )}
      {activeTab === 'track' && <PackageTrackPanel />}
      {activeTab === 'returns' && <PackageReturnsPanel />}
    </PageShell>
  );
}
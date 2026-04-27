import { useState, type ReactNode } from 'react';
import { C, R, TYPE } from '../utils/wasel-ds';

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
}

interface WaselTabsProps {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
}

export function WaselTabs({ tabs, defaultTab, onChange }: WaselTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  const activeContent = tabs.find(t => t.id === activeTab)?.content;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          gap: 4,
          padding: 4,
          background: C.panel,
          borderRadius: R.full,
          border: `1px solid ${C.border}`,
        }}
      >
        {tabs.map(tab => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '10px 16px',
                borderRadius: R.full,
                border: 'none',
                background: isActive ? C.cyan : 'transparent',
                color: isActive ? C.navy : C.textMuted,
                fontSize: TYPE.size.sm,
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>
      <div style={{ marginTop: 16 }}>{activeContent}</div>
    </div>
  );
}

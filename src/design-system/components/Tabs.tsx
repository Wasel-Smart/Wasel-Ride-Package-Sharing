import type { ReactNode } from 'react';

export type TabItem<T extends string> = {
  content: ReactNode;
  label: string;
  value: T;
};

type TabsProps<T extends string> = {
  items: TabItem<T>[];
  label: string;
  onChange: (value: T) => void;
  value: T;
};

export function Tabs<T extends string>({ items, label, onChange, value }: TabsProps<T>) {
  const active = items.find((item) => item.value === value) ?? items[0];

  return (
    <div className="ds-tabs">
      <div aria-label={label} className="ds-tab-list" role="tablist">
        {items.map((item) => (
          <button
            aria-selected={item.value === value}
            className="ds-tab-trigger"
            data-active={item.value === value}
            key={item.value}
            onClick={() => onChange(item.value)}
            role="tab"
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="ds-tab-panel" role="tabpanel">
        {active?.content}
      </div>
    </div>
  );
}

export default Tabs;

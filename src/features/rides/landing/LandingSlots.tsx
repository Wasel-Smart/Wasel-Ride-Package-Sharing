import { Fragment, type ReactNode } from 'react';
import { WaselBusinessFooter, WaselWhyCard } from '../../../components/system/WaselPresence';
import type { LandingRowDefinition, LandingSlotId } from './landingTypes';

type LandingSlotRowsProps = {
  rows: readonly LandingRowDefinition[];
  slots: Partial<Record<LandingSlotId, ReactNode>>;
};

export function LandingSlotRows({ rows, slots }: LandingSlotRowsProps) {
  return (
    <>
      {rows.map(row => {
        const renderedSlots = row.slots.flatMap(slotId =>
          slots[slotId] ? [{ id: slotId, node: slots[slotId] as ReactNode }] : [],
        );
        if (renderedSlots.length === 0) {
          return null;
        }
        return (
          <div key={row.id} className={row.className} style={row.style}>
            {renderedSlots.map(slot => (
              <Fragment key={slot.id}>{slot.node}</Fragment>
            ))}
          </div>
        );
      })}
    </>
  );
}

export function LandingWhySlot({ ar }: { ar: boolean }) {
  return <WaselWhyCard ar={ar} compact />;
}

export function LandingFooterSlot({ ar }: { ar: boolean }) {
  return <WaselBusinessFooter ar={ar} />;
}

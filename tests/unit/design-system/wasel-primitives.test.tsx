import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { WaselBadge, WaselButton, WaselDialog, WaselSelect } from '../../../src/design-system';

describe('Wasel design-system primitives', () => {
  it('renders a loading button as disabled without hiding its label', () => {
    render(<WaselButton loading>Confirm trip</WaselButton>);

    const button = screen.getByRole('button', { name: /confirm trip/i });
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Confirm trip');
  });

  it('renders standard badge variants with default labels', () => {
    render(
      <div>
        <WaselBadge variant="live" />
        <WaselBadge variant="ai" />
        <WaselBadge variant="new" />
      </div>,
    );

    expect(screen.getByText('LIVE DATA')).toBeInTheDocument();
    expect(screen.getByText('AI POWERED')).toBeInTheDocument();
    expect(screen.getByText('NEW')).toBeInTheDocument();
  });

  it('provides an accessible select and reports selected values', () => {
    const handleChange = vi.fn();

    render(
      <WaselSelect
        label="Vehicle type"
        placeholder="Choose vehicle"
        options={[
          { value: 'sedan', label: 'Sedan' },
          { value: 'van', label: 'Van' },
        ]}
        onChange={handleChange}
      />,
    );

    const select = screen.getByLabelText('Vehicle type');
    fireEvent.change(select, { target: { value: 'van' } });

    expect(handleChange).toHaveBeenCalledWith('van');
  });

  it('renders dialog content only when open and wires the close action', () => {
    const handleClose = vi.fn();
    const { rerender } = render(
      <WaselDialog open={false} title="Cancel ride" onClose={handleClose}>
        Cancel details
      </WaselDialog>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    rerender(
      <WaselDialog
        open
        title="Cancel ride"
        description="Review before cancelling"
        onClose={handleClose}
      >
        Cancel details
      </WaselDialog>,
    );

    expect(screen.getByRole('dialog', { name: 'Cancel ride' })).toBeInTheDocument();
    expect(screen.getByText('Cancel details')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

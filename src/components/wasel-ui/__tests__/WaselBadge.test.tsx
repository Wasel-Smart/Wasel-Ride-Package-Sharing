import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WaselBadge } from '../WaselBadge';

describe('WaselBadge', () => {
  it('renders with default live variant', () => {
    const { container } = render(<WaselBadge />);
    expect(container.querySelector('span')).toBeTruthy();
  });

  it('renders custom label', () => {
    render(<WaselBadge label="CUSTOM" />);
    expect(screen.getByText('CUSTOM')).toBeTruthy();
  });

  it('renders default labels for known variants', () => {
    render(<WaselBadge variant="ai" />);
    expect(screen.getByText('AI POWERED')).toBeTruthy();
  });

  it('applies custom className', () => {
    const { container } = render(<WaselBadge className="custom-badge" />);
    expect(container.querySelector('.custom-badge')).toBeTruthy();
  });

  it('renders custom icon', () => {
    render(<WaselBadge icon={<span data-testid="custom-icon">★</span>} />);
    expect(screen.getByTestId('custom-icon')).toBeTruthy();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WaselCard } from '../WaselCard';

describe('WaselCard', () => {
  it('renders children correctly', () => {
    render(<WaselCard>Card content</WaselCard>);
    expect(screen.getByText('Card content')).toBeTruthy();
  });

  it('applies custom className and style', () => {
    const { container } = render(
      <WaselCard className="custom-class" style={{ marginTop: 10 }}>
        Content
      </WaselCard>,
    );
    const card = container.firstChild as HTMLElement;
    expect(card.classList.contains('custom-class')).toBe(true);
    expect(card.style.marginTop).toBe('10px');
  });

  it('forwards additional props to the root element', () => {
    const onClick = vi.fn();
    const { container } = render(
      <WaselCard onClick={onClick} data-testid="my-card">
        Clickable
      </WaselCard>,
    );
    const card = container.firstChild as HTMLElement;
    expect(card.getAttribute('data-testid')).toBe('my-card');
    fireEvent.click(card);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders with default variant when none specified', () => {
    const { container } = render(<WaselCard>Default</WaselCard>);
    const card = container.firstChild as HTMLElement;
    expect(card.style.background).toBeTruthy();
  });
});

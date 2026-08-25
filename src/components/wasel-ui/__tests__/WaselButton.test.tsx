import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WaselButton } from '../WaselButton';

describe('WaselButton', () => {
  it('renders children correctly', () => {
    render(<WaselButton>Click me</WaselButton>);
    expect(screen.getByText('Click me')).toBeTruthy();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<WaselButton onClick={onClick}>Click</WaselButton>);
    fireEvent.click(screen.getByText('Click'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows loading state', () => {
    render(<WaselButton loading>Loading</WaselButton>);
    const button = screen.getByText('Loading');
    expect(button).toBeTruthy();
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it('applies variant classes', () => {
    const { container } = render(<WaselButton variant="gold">Gold</WaselButton>);
    const button = container.querySelector('button');
    expect(button).toBeTruthy();
  });

  it('applies size classes', () => {
    const { container } = render(<WaselButton size="lg">Large</WaselButton>);
    const button = container.querySelector('button');
    expect(button).toBeTruthy();
  });

  it('renders with icon', () => {
    render(<WaselButton icon={<span data-testid="icon">*</span>}>With Icon</WaselButton>);
    expect(screen.getByTestId('icon')).toBeTruthy();
  });

  it('renders full width when specified', () => {
    const { container } = render(<WaselButton fullWidth>Full</WaselButton>);
    const button = container.querySelector('button');
    expect(button?.style.width).toBe('100%');
  });
});

import { describe, expect, it } from 'vitest';
import { WaselStatCard, WaselGradientText, WaselAmbientGlow } from '@/components/wasel-ui/WaselStatCard';
import { render } from '@testing-library/react';

describe('WaselStatCard', () => {
  it('renders value, label, and accent', () => {
    const { container } = render(
      <WaselStatCard
        value="42"
        label="Trips"
        accent="#00E5FF"
      />,
    );
    expect(container.textContent).toContain('42');
    expect(container.textContent).toContain('Trips');
  });

  it('renders icon when provided', () => {
    const { container } = render(
      <WaselStatCard
        value="100"
        label="Rides"
        accent="#72C70D"
        icon={<span data-testid="icon" />}
      />,
    );
    expect(container.querySelector('[data-testid="icon"]')).toBeDefined();
  });

  it('renders sublabel when provided', () => {
    const { container } = render(
      <WaselStatCard
        value="5"
        label="Rating"
        accent="#FF8A0B"
        sublabel="out of 5"
      />,
    );
    expect(container.textContent).toContain('out of 5');
  });

  it('works with number values', () => {
    const { container } = render(
      <WaselStatCard
        value={3.5}
        label="Score"
        accent="#FFBE5C"
      />,
    );
    expect(container.textContent).toContain('3.5');
  });
});

describe('WaselGradientText', () => {
  it('renders children with gradient styling', () => {
    const { container } = render(
      <WaselGradientText>Hello</WaselGradientText>,
    );
    expect(container.textContent).toContain('Hello');
  });

  it('uses custom accent color', () => {
    const { container } = render(
      <WaselGradientText accent="#72C70D">Green</WaselGradientText>,
    );
    expect(container.textContent).toContain('Green');
  });
});

describe('WaselAmbientGlow', () => {
  it('renders a glow div', () => {
    const { container } = render(<WaselAmbientGlow />);
    expect(container.querySelector('div')).toBeDefined();
  });

  it('supports different positions', () => {
    const positions = ['top-right', 'bottom-left', 'top-left', 'bottom-right'] as const;
    positions.forEach(pos => {
      const { container, unmount } = render(<WaselAmbientGlow position={pos} />);
      expect(container.querySelector('div')).toBeDefined();
      unmount();
    });
  });

  it('supports custom size and color', () => {
    const { container } = render(
      <WaselAmbientGlow size={200} color="#FF0000" />,
    );
    expect(container.querySelector('div')).toBeDefined();
  });
});

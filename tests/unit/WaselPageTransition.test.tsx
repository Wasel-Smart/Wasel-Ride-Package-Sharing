import { describe, expect, it } from 'vitest';
import { WaselPageTransition, WaselPageTransitionWrap, WaselStaggerContainer } from '@/components/wasel-ui/WaselPageTransition';
import { render } from '@testing-library/react';

describe('WaselPageTransition', () => {
  it('renders children', () => {
    const { container } = render(
      <WaselPageTransition>
        <div>Hello</div>
      </WaselPageTransition>,
    );
    expect(container.textContent).toContain('Hello');
  });

  it('renders with sync mode', () => {
    const { container } = render(
      <WaselPageTransition mode="sync">
        <div>Sync</div>
      </WaselPageTransition>,
    );
    expect(container.textContent).toContain('Sync');
  });

  it('supports custom transition duration', () => {
    const { container } = render(
      <WaselPageTransition transition={{ duration: 0.5 }}>
        <div>Slow</div>
      </WaselPageTransition>,
    );
    expect(container.textContent).toContain('Slow');
  });
});

describe('WaselPageTransitionWrap', () => {
  it('renders children with animation wrapper', () => {
    const { container } = render(
      <WaselPageTransitionWrap>
        <div>Wrapped</div>
      </WaselPageTransitionWrap>,
    );
    expect(container.textContent).toContain('Wrapped');
  });

  it('applies custom className', () => {
    const { container } = render(
      <WaselPageTransitionWrap className="my-class">
        <div>Test</div>
      </WaselPageTransitionWrap>,
    );
    expect(container.querySelector('.my-class')).toBeDefined();
  });
});

describe('WaselStaggerContainer', () => {
  it('renders children with stagger support', () => {
    const { container } = render(
      <WaselStaggerContainer gap={12}>
        <div>Item 1</div>
        <div>Item 2</div>
      </WaselStaggerContainer>,
    );
    expect(container.textContent).toContain('Item 1');
    expect(container.textContent).toContain('Item 2');
  });

  it('uses default gap when not specified', () => {
    const { container } = render(
      <WaselStaggerContainer>
        <div>Item</div>
      </WaselStaggerContainer>,
    );
    expect(container.textContent).toContain('Item');
  });
});

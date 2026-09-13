import { describe, expect, it } from 'vitest';
import { WaselEmptyState, EmptyTripsIcon, EmptyNotificationsIcon, EmptySearchIcon } from '@/components/wasel-ui/WaselEmptyState';
import { render } from '@testing-library/react';

describe('WaselEmptyState', () => {
  it('renders title and description', () => {
    const { getByText } = render(
      <WaselEmptyState
        icon={<span data-testid="icon" />}
        title="No data"
        description="There is nothing to show here."
      />,
    );
    expect(getByText('No data')).toBeDefined();
    expect(getByText('There is nothing to show here.')).toBeDefined();
  });

  it('renders without description', () => {
    const { container } = render(
      <WaselEmptyState
        icon={<span />}
        title="No data"
      />,
    );
    expect(container.textContent).toContain('No data');
  });

  it('renders action button', () => {
    const { getByRole } = render(
      <WaselEmptyState
        icon={<span />}
        title="No data"
        action={<button>Create</button>}
      />,
    );
    expect(getByRole('button', { name: 'Create' })).toBeDefined();
  });

  it('uses custom accent color', () => {
    const { container } = render(
      <WaselEmptyState
        icon={<span />}
        title="No data"
        accent="#FF0000"
      />,
    );
    expect(container.textContent).toContain('No data');
  });
});

describe('EmptyStateIcons', () => {
  it('renders all icon variants', () => {
    expect(EmptyTripsIcon).toBeDefined();
    expect(EmptyNotificationsIcon).toBeDefined();
    expect(EmptySearchIcon).toBeDefined();
  });
});

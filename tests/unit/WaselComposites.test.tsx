import { describe, expect, it } from 'vitest';
import { WaselDashboardPage, WaselContentSection, WaselEmptyPage, WaselStatsGrid } from '@/components/wasel-ui';
import { render } from '@testing-library/react';
import { C } from '@/utils/wasel-ds';

describe('WaselDashboardPage', () => {
  it('renders all sections', () => {
    const { container } = render(
      <WaselDashboardPage
        icon={<span>📊</span>}
        eyebrow="Overview"
        title="Dashboard"
        description="Your daily overview"
        metrics={[{ label: 'Trips', value: 5, accent: '#00E5FF' }]}
      >
        <div>Content</div>
      </WaselDashboardPage>,
    );
    expect(container.textContent).toContain('Dashboard');
    expect(container.textContent).toContain('Overview');
    expect(container.textContent).toContain('5');
    expect(container.textContent).toContain('Content');
  });

  it('renders multiple metrics', () => {
    const { container } = render(
      <WaselDashboardPage
        icon={<span />}
        eyebrow="Stats"
        title="Stats"
        description=""
        metrics={[
          { label: 'A', value: 1, accent: '#00E5FF' },
          { label: 'B', value: 2, accent: '#72C70D' },
          { label: 'C', value: 3, accent: '#FF8A0B' },
        ]}
      >
        <div />
      </WaselDashboardPage>,
    );
    expect(container.textContent).toContain('1');
    expect(container.textContent).toContain('2');
    expect(container.textContent).toContain('3');
  });

  it('renders actions', () => {
    const { getByRole } = render(
      <WaselDashboardPage
        icon={<span />}
        eyebrow="Actions"
        title="Title"
        description=""
        actions={<button>Create</button>}
        metrics={[{ label: 'X', value: 0, accent: C.cyan }]}
      >
        <div />
      </WaselDashboardPage>,
    );
    expect(getByRole('button', { name: 'Create' })).toBeDefined();
  });
});

describe('WaselContentSection', () => {
  it('renders section with title and children', () => {
    const { container } = render(
      <WaselContentSection
        icon={<span>📁</span>}
        title="Documents"
        children={<div>File list</div>}
      />,
    );
    expect(container.textContent).toContain('Documents');
    expect(container.textContent).toContain('File list');
  });

  it('renders subtitle when provided', () => {
    const { container } = render(
      <WaselContentSection
        icon={<span />}
        title="Settings"
        subtitle="Configure your account"
        children={<div />}
      />,
    );
    expect(container.textContent).toContain('Configure your account');
  });

  it('renders action button', () => {
    const { getByRole } = render(
      <WaselContentSection
        icon={<span />}
        title="Users"
        action={<button>Add</button>}
        children={<div />}
      />,
    );
    expect(getByRole('button', { name: 'Add' })).toBeDefined();
  });
});

describe('WaselEmptyPage', () => {
  it('renders empty state', () => {
    const { container } = render(
      <WaselEmptyPage
        icon={<span>📭</span>}
        title="No data"
        description="There is nothing here yet"
        action={<button>Create</button>}
      />,
    );
    expect(container.textContent).toContain('No data');
    expect(container.textContent).toContain('There is nothing here yet');
  });

  it('works without action', () => {
    const { container } = render(
      <WaselEmptyPage
        icon={<span />}
        title="Empty"
        description="Nothing here"
      />,
    );
    expect(container.textContent).toContain('Empty');
  });
});

describe('WaselStatsGrid', () => {
  it('renders all stat cards', () => {
    const { container } = render(
      <WaselStatsGrid
        stats={[
          { label: 'Trips', value: 5 },
          { label: 'Rides', value: 10 },
        ]}
      />,
    );
    expect(container.textContent).toContain('5');
    expect(container.textContent).toContain('10');
  });

  it('renders with title', () => {
    const { container } = render(
      <WaselStatsGrid
        title="Statistics"
        stats={[{ label: 'X', value: 1 }]}
      />,
    );
    expect(container.textContent).toContain('Statistics');
  });

  it('uses custom accent for all cards', () => {
    const { container } = render(
      <WaselStatsGrid
        accent="#FF8A0B"
        stats={[{ label: 'A', value: 1 }]}
      />,
    );
    expect(container.textContent).toContain('1');
  });

  it('uses per-stat accent overrides', () => {
    const { container } = render(
      <WaselStatsGrid
        stats={[
          { label: 'A', value: 1, accent: '#FF8A0B' },
          { label: 'B', value: 2 },
        ]}
      />,
    );
    expect(container.textContent).toContain('1');
    expect(container.textContent).toContain('2');
  });
});
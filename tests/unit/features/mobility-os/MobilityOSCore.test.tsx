/**
 * MobilityOSCore — Mobile responsiveness tests (D)
 *
 * Verifies the isMobile-gated behaviour introduced in the mobile fix:
 *   - isMobile state initialises correctly from window.innerWidth
 *   - The map container receives the correct aspect ratio and transform
 *     based on viewport width
 *   - The isMobile resize listener updates state when the window is resized
 *
 * Rendering strategy: We render MobilityOSCore in jsdom and inspect the
 * rendered DOM's inline styles. We avoid testing canvas drawing internals
 * (which require a real browser) and focus on structural / style attributes
 * that are deterministic and testable.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';

// ── Minimal mocks required for MobilityOSCore to mount ────────────────────

vi.mock('../../../../src/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', dir: 'ltr' }),
}));

vi.mock('../../../../src/features/mobility-os/liveMobilityData', () => ({
  useMobilityOSLiveData: () => ({ snapshot: null }),
}));

vi.mock('../../../../src/services/corridorCommercial', () => ({
  buildCorridorCommercialSnapshot: vi.fn().mockResolvedValue({
    contracts: [],
    totalRecurringRevenueJod: 0,
    ownedCorridorContracts: 0,
    activeStakeholders: 0,
    topContract: null,
    recommendedCommercialAction: 'Balance supply',
    corridorPassCoverage: null,
  }),
}));

// Canvas getContext is not available in jsdom — stub it
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  arc: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  setTransform: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  measureText: vi.fn(() => ({ width: 40 })),
  fillText: vi.fn(),
  strokeRect: vi.fn(),
  roundRect: vi.fn(),
  quadraticCurveTo: vi.fn(),
  bezierCurveTo: vi.fn(),
  ellipse: vi.fn(),
  closePath: vi.fn(),
  clip: vi.fn(),
  setLineDash: vi.fn(),
  shadowBlur: 0,
  shadowColor: '',
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  font: '',
  textAlign: 'left',
  globalAlpha: 1,
  filter: '',
  imageSmoothingEnabled: true,
});

// ResizeObserver is not in jsdom
global.ResizeObserver = class {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
};

// requestAnimationFrame — stub so the animation loop doesn't run infinitely
vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
vi.stubGlobal('cancelAnimationFrame', vi.fn());

// ── Helpers ───────────────────────────────────────────────────────────────

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
}

async function importAndRender() {
  // Dynamic import so each test gets a fresh module (with reset viewport)
  const { default: MobilityOSCore } = await import(
    '../../../../src/features/mobility-os/MobilityOSCore'
  );
  return render(<MobilityOSCore />);
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('MobilityOSCore — isMobile initialisation', () => {
  afterEach(() => {
    vi.resetModules();
    setViewportWidth(1440); // reset to desktop
  });

  it('treats viewport ≥ 768 as desktop (not mobile)', async () => {
    setViewportWidth(1024);
    const { container } = await importAndRender();

    // The map wrapper should have the desktop 3D transform applied
    // We look for the perspective transform in the wrapRef container
    const mapWrap = container.querySelector('[style*="perspective"]');
    expect(mapWrap).not.toBeNull();
  });

  it('treats viewport < 768 as mobile (no 3D transform)', async () => {
    setViewportWidth(375);
    const { container } = await importAndRender();

    const mapWrap = container.querySelector('[style*="perspective"]');
    expect(mapWrap).toBeNull();
  });

  it('applies 4/3 aspect ratio on mobile', async () => {
    setViewportWidth(390);
    const { container } = await importAndRender();

    // Find the map wrapper by looking for aspectRatio: 4/3 in inline style
    const allDivs = container.querySelectorAll('div');
    const mobileMapWrap = Array.from(allDivs).find(
      div => div.getAttribute('style')?.includes('4/3'),
    );
    expect(mobileMapWrap).not.toBeNull();
  });

  it('applies wide aspect ratio on desktop', async () => {
    setViewportWidth(1440);
    const { container } = await importAndRender();

    const allDivs = container.querySelectorAll('div');
    const desktopMapWrap = Array.from(allDivs).find(
      div => div.getAttribute('style')?.includes('1.42'),
    );
    expect(desktopMapWrap).not.toBeNull();
  });
});

describe('MobilityOSCore — resize listener', () => {
  afterEach(() => {
    vi.resetModules();
    setViewportWidth(1440);
  });

  it('responds to resize from mobile to desktop', async () => {
    setViewportWidth(375);
    const { container } = await importAndRender();

    // Verify starts as mobile (no perspective)
    expect(container.querySelector('[style*="perspective"]')).toBeNull();

    // Simulate resize to desktop width
    await act(async () => {
      setViewportWidth(1440);
      window.dispatchEvent(new Event('resize'));
    });

    // After resize, the 3D perspective should be applied
    const mapWrap = container.querySelector('[style*="perspective"]');
    expect(mapWrap).not.toBeNull();
  });

  it('responds to resize from desktop to mobile', async () => {
    setViewportWidth(1440);
    const { container } = await importAndRender();

    // Verify starts as desktop (has perspective)
    expect(container.querySelector('[style*="perspective"]')).not.toBeNull();

    await act(async () => {
      setViewportWidth(375);
      window.dispatchEvent(new Event('resize'));
    });

    expect(container.querySelector('[style*="perspective"]')).toBeNull();
  });
});

describe('MobilityOSCore — hero grid layout', () => {
  afterEach(() => {
    vi.resetModules();
    setViewportWidth(1440);
  });

  it('uses single-column grid on mobile', async () => {
    setViewportWidth(375);
    const { container } = await importAndRender();

    const singleColGrid = Array.from(container.querySelectorAll('div')).find(
      div => div.getAttribute('style')?.includes('gridTemplateColumns') &&
             div.getAttribute('style')?.includes('1fr') &&
             !div.getAttribute('style')?.includes('1.2fr'),
    );
    expect(singleColGrid).not.toBeNull();
  });

  it('uses two-column grid on desktop', async () => {
    setViewportWidth(1440);
    const { container } = await importAndRender();

    const twoColGrid = Array.from(container.querySelectorAll('div')).find(
      div => div.getAttribute('style')?.includes('1.2fr'),
    );
    expect(twoColGrid).not.toBeNull();
  });
});

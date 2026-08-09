import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WaselLogo, WaselMark, WaselHeroMark, WaselIcon } from '../../wasel-ui/WaselLogo';

const SYMBOL_RATIO = 1536 / 1024;

function getLogoImage(name = 'Wasel') {
  const image = screen.getByRole('img', { name }).querySelector('img');
  expect(image).not.toBeNull();
  return image as HTMLImageElement;
}

describe('WaselLogo', () => {
  it('renders standalone with an accessible English fallback', () => {
    render(<WaselLogo />);
    expect(screen.getByRole('img', { name: 'Wasel' })).toBeDefined();
  });

  it('uses the expected symbol dimensions for a custom size', () => {
    render(<WaselLogo size={60} />);
    const image = getLogoImage();
    expect(image.getAttribute('width')).toBe(String(Math.round(60 * SYMBOL_RATIO)));
    expect(image.getAttribute('height')).toBe('60');
  });

  it('honors a custom accessible name', () => {
    render(<WaselLogo alt="Custom Alt" />);
    expect(screen.getByRole('img', { name: 'Custom Alt' })).toBeDefined();
  });

  it('renders WaselMark', () => {
    render(<WaselMark size={40} />);
    const image = getLogoImage();
    expect(image.getAttribute('width')).toBe(String(Math.round(40 * SYMBOL_RATIO)));
    expect(image.getAttribute('height')).toBe('40');
  });

  it('renders WaselHeroMark', () => {
    render(<WaselHeroMark size={100} />);
    expect(screen.getByRole('img', { name: 'Wasel' })).toBeDefined();
  });

  it('enforces the icon minimum size', () => {
    render(<WaselIcon size={16} />);
    const image = getLogoImage();
    expect(image.getAttribute('width')).toBe(String(Math.round(18 * SYMBOL_RATIO)));
    expect(image.getAttribute('height')).toBe('18');
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WaselLogo, WaselMark, WaselHeroMark, WaselIcon } from '../WaselLogo';

describe('WaselLogo', () => {
  it('renders with default props', () => {
    render(<WaselLogo />);
    const img = screen.getByAltText('Wasel') as HTMLImageElement;
    expect(img).toBeDefined();
    expect(img.tagName).toBe('IMG');
  });

  it('renders with custom size', () => {
    render(<WaselLogo size={60} />);
    const img = screen.getByAltText('Wasel') as HTMLImageElement;
    expect(img.getAttribute('width')).toBe(String(Math.round(60 * 1)));
    expect(img.getAttribute('height')).toBe(String(60));
  });

  it('renders with custom alt text', () => {
    render(<WaselLogo alt="Custom Alt" />);
    expect(screen.getByAltText('Custom Alt')).toBeDefined();
  });

  it('renders WaselMark', () => {
    render(<WaselMark size={40} />);
    const img = screen.getByAltText('Wasel') as HTMLImageElement;
    expect(img.getAttribute('width')).toBe('40');
    expect(img.getAttribute('height')).toBe('40');
  });

  it('renders WaselHeroMark', () => {
    render(<WaselHeroMark size={100} />);
    const img = screen.getByAltText('Wasel') as HTMLImageElement;
    expect(img).toBeDefined();
  });

  it('renders WaselIcon', () => {
    render(<WaselIcon size={16} />);
    const img = screen.getByAltText('Wasel') as HTMLImageElement;
    expect(img.getAttribute('width')).toBe('16');
    expect(img.getAttribute('height')).toBe('16');
  });

  it('handles broken image gracefully', () => {
    render(<WaselLogo />);
    const img = screen.getByAltText('Wasel') as HTMLImageElement;
    expect(img.onerror).toBeDefined();
  });
});

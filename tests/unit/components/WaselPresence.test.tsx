import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WaselContactActionRow } from '@/components/system/WaselPresence';

vi.mock('@/domains/trust/waselPresence', () => ({
  getWaselPresenceProfile: () => ({
    contactActions: [
      { id: 'call', href: 'tel:+962000', label: 'Call support', labelAr: 'اتصل بالدعم' },
      {
        id: 'whatsapp',
        href: 'https://wa.me/962000',
        label: 'WhatsApp',
        labelAr: 'واتساب',
      },
      { id: 'email', href: 'mailto:support@example.com', label: 'Email us', labelAr: 'راسلنا' },
    ],
    proofOfLife: { en: 'Live', ar: 'مباشر' },
    actionSummary: { en: 'Trusted support', ar: 'دعم موثوق' },
    supportPhoneDisplay: '+962 00 000 0000',
    supportEmail: 'support@example.com',
  }),
  getWaselPresenceSignals: () => [],
}));

describe('WaselContactActionRow', () => {
  it('adds explicit accessible labels for each contact action', () => {
    render(<WaselContactActionRow ar={false} />);

    expect(screen.getByRole('link', { name: 'Call support via Call support' })).toHaveAttribute(
      'href',
      'tel:+962000',
    );
    expect(screen.getByRole('link', { name: 'Email support via Email us' })).toHaveAttribute(
      'href',
      'mailto:support@example.com',
    );
  });

  it('protects the external WhatsApp action with a new-tab label and noopener rel', () => {
    render(<WaselContactActionRow ar={false} />);

    const whatsappLink = screen.getByRole('link', { name: 'Open WhatsApp in a new tab' });

    expect(whatsappLink).toHaveAttribute('target', '_blank');
    expect(whatsappLink).toHaveAttribute('rel', 'noreferrer noopener');
  });
});

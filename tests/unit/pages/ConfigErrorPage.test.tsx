import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ConfigErrorPage } from '@/pages/ConfigErrorPage';
import type { RuntimeConfigIssue } from '@/utils/env';

const errorIssue: RuntimeConfigIssue = {
  key: 'VITE_SUPABASE_URL',
  message: 'Missing Supabase URL',
  severity: 'error',
};

const warningIssue: RuntimeConfigIssue = {
  key: 'VITE_ENABLE_DEMO_DATA',
  message: 'Demo data is enabled',
  severity: 'warning',
};

describe('ConfigErrorPage', () => {
  it('renders configuration error heading', () => {
    render(<ConfigErrorPage issues={[]} />);
    expect(screen.getByText('Environment configuration errors')).toBeDefined();
    expect(screen.getByText('Configuration Error')).toBeDefined();
  });

  it('renders listed errors', () => {
    render(<ConfigErrorPage issues={[errorIssue]} />);
    expect(screen.getByText('Missing Supabase URL')).toBeDefined();
    expect(screen.getByText(/Variable:/)).toBeDefined();
  });

  it('renders listed warnings', () => {
    render(<ConfigErrorPage issues={[warningIssue]} />);
    expect(screen.getByText('Demo data is enabled')).toBeDefined();
    expect(screen.getByText('Warnings:')).toBeDefined();
  });

  it('skips sections when their issue type is absent', () => {
    render(<ConfigErrorPage issues={[warningIssue]} />);
    expect(() => screen.getByText('Missing Supabase URL')).toThrow();
  });

  it('renders support instructions', () => {
    render(<ConfigErrorPage issues={[]} />);
    expect(screen.getByText('For Vercel deployments:')).toBeDefined();
    expect(screen.getByText('Redeploy your application')).toBeDefined();
  });

  it('renders both errors and warnings together', () => {
    render(<ConfigErrorPage issues={[errorIssue, warningIssue]} />);
    expect(screen.getByText('Missing Supabase URL')).toBeDefined();
    expect(screen.getByText('Demo data is enabled')).toBeDefined();
    expect(screen.getByText('Warnings:')).toBeDefined();
  });
});

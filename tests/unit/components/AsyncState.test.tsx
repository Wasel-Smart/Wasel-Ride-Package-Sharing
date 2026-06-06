import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AsyncState } from '../../../src/ui/feedback/AsyncState';

describe('AsyncState', () => {
  it('renders a user-facing error fallback', () => {
    render(<AsyncState isError title="Could not load rides" description="Please retry." />);

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load rides');
    expect(screen.getByText('Please retry.')).toBeInTheDocument();
  });

  it('renders children when data is ready', () => {
    render(<AsyncState><span>Ready</span></AsyncState>);

    expect(screen.getByText('Ready')).toBeInTheDocument();
  });
});

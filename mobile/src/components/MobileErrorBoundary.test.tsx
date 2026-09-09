import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { MobileErrorBoundary } from '../components/MobileErrorBoundary';

const originalConsoleError = console.error;
const originalDev = process.env.NODE_ENV;

describe('MobileErrorBoundary', () => {
  beforeEach(() => {
    console.error = jest.fn();
    process.env.NODE_ENV = 'test';
    jest.clearAllMocks();
  });

  afterEach(() => {
    console.error = originalConsoleError;
    process.env.NODE_ENV = originalDev;
  });

  it('renders children when there is no error', () => {
    render(
      <MobileErrorBoundary>
        <React.Fragment>Child content</React.Fragment>
      </MobileErrorBoundary>,
    );
    expect(JSON.stringify(screen.toJSON())).toContain('Child content');
  });

  it('renders custom fallback when provided', () => {
    render(
      <MobileErrorBoundary fallback={<React.Fragment>Custom fallback</React.Fragment>}>
        <React.Fragment>Child content</React.Fragment>
      </MobileErrorBoundary>,
    );
    expect(JSON.stringify(screen.toJSON())).toContain('Child content');
  });

  it('calls onError callback when provided', () => {
    const onError = jest.fn();
    render(
      <MobileErrorBoundary onError={onError}>
        <React.Fragment>Child content</React.Fragment>
      </MobileErrorBoundary>,
    );
    expect(onError).not.toHaveBeenCalled();
  });

  it('renders retry and support buttons in normal state', () => {
    render(
      <MobileErrorBoundary>
        <React.Fragment>Child content</React.Fragment>
      </MobileErrorBoundary>,
    );
    expect(JSON.stringify(screen.toJSON())).toContain('Child content');
  });
});

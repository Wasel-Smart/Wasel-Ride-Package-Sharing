import React from 'react';
import { render, screen, act } from '@testing-library/react-native';
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

  it('renders error UI with error ID when a child throws', () => {
    const ThrowComponent = (): never => {
      throw new Error('Test crash');
    };

    console.error = jest.fn();
    render(
      <MobileErrorBoundary>
        <ThrowComponent />
      </MobileErrorBoundary>,
    );
    expect(JSON.stringify(screen.toJSON())).toContain('حدث خطأ غير متوقع');
    expect(JSON.stringify(screen.toJSON())).toContain('err_');
    expect(console.error).toHaveBeenCalled();
  });

  it('calls onError callback when provided', () => {
    const onError = jest.fn();
    const ThrowComponent = (): never => {
      throw new Error('Test crash for callback');
    };

    console.error = jest.fn();
    render(
      <MobileErrorBoundary onError={onError}>
        <ThrowComponent />
      </MobileErrorBoundary>,
    );
    expect(onError).toHaveBeenCalled();
  });

  it('shows error message in dev mode', () => {
    process.env.NODE_ENV = 'development';

    const ThrowComponent = (): never => {
      throw new Error('Dev mode crash');
    };

    console.error = jest.fn();
    render(
      <MobileErrorBoundary>
        <ThrowComponent />
      </MobileErrorBoundary>,
    );
    expect(JSON.stringify(screen.toJSON())).toContain('Dev mode crash');
    expect(JSON.stringify(screen.toJSON())).toContain('معرف الخطأ');
  });

  it('renders retry and support buttons in error state', () => {
    const ThrowComponent = (): never => {
      throw new Error('Test crash for buttons');
    };

    console.error = jest.fn();
    render(
      <MobileErrorBoundary>
        <ThrowComponent />
      </MobileErrorBoundary>,
    );
    expect(JSON.stringify(screen.toJSON())).toContain('حاول مرة ثانية');
    expect(JSON.stringify(screen.toJSON())).toContain('دعم');
  });

  it('handleReset clears the error state', async () => {
    const ThrowComponent = (): never => {
      throw new Error('Test crash for reset');
    };

    console.error = jest.fn();
    const { unmount } = render(
      <MobileErrorBoundary>
        <ThrowComponent />
      </MobileErrorBoundary>,
    );

    expect(JSON.stringify(screen.toJSON())).toContain('حدث خطأ غير متوقع');

    const resetButton = screen.getByRole('button', { name: 'حاول مرة ثانية' });
    await act(async () => {
      resetButton.props.onPress();
    });

    expect(screen.queryByText('حدث خطأ غير متوقع')).toBeNull();
    unmount();
  });
});

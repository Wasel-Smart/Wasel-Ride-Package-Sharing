import React, { act } from 'react';
import { Text } from 'react-native';
import TestRenderer from 'react-test-renderer';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
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
    const renderer = TestRenderer.create(
      <MobileErrorBoundary>
        <Text>Child content</Text>
      </MobileErrorBoundary>,
    );
    expect(JSON.stringify(renderer.toJSON())).toContain('Child content');
  });

  it('renders custom fallback when provided', () => {
    const renderer = TestRenderer.create(
      <MobileErrorBoundary fallback={<Text>Custom fallback</Text>}>
        <Text>Child content</Text>
      </MobileErrorBoundary>,
    );
    expect(JSON.stringify(renderer.toJSON())).toContain('Child content');
  });

  it('renders error UI with error ID when a child throws', () => {
    const ThrowComponent = (): never => {
      throw new Error('Test crash');
    };

    console.error = jest.fn();
    const renderer = TestRenderer.create(
      <MobileErrorBoundary>
        <ThrowComponent />
      </MobileErrorBoundary>,
    );
    const tree = JSON.stringify(renderer.toJSON());
    expect(tree).toContain('حدث خطأ غير متوقع');
    expect(tree).toContain('err_');
    expect(console.error).toHaveBeenCalled();
  });

  it('calls onError callback when provided', () => {
    const onError = jest.fn();
    const ThrowComponent = (): never => {
      throw new Error('Test crash for callback');
    };

    console.error = jest.fn();
    TestRenderer.create(
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
    const renderer = TestRenderer.create(
      <MobileErrorBoundary>
        <ThrowComponent />
      </MobileErrorBoundary>,
    );
    const tree = JSON.stringify(renderer.toJSON());
    expect(tree).toContain('Dev mode crash');
    expect(tree).toContain('معرف الخطأ');
  });

  it('renders retry and support buttons in error state', () => {
    const ThrowComponent = (): never => {
      throw new Error('Test crash for buttons');
    };

    console.error = jest.fn();
    const renderer = TestRenderer.create(
      <MobileErrorBoundary>
        <ThrowComponent />
      </MobileErrorBoundary>,
    );
    const tree = JSON.stringify(renderer.toJSON());
    expect(tree).toContain('حاول مرة ثانية');
    expect(tree).toContain('دعم');
  });

  it('handleReset clears the error state', async () => {
    const ThrowComponent = (): never => {
      throw new Error('Test crash for reset');
    };

    console.error = jest.fn();
    const testRenderer = TestRenderer.create(
      <MobileErrorBoundary>
        <ThrowComponent />
      </MobileErrorBoundary>,
    );

    const instance = testRenderer.root.instance as unknown as MobileErrorBoundary;

    expect(instance.state.hasError).toBe(true);
    await act(async () => {
      testRenderer.update(
        <MobileErrorBoundary>
          <Text>Recovered screen</Text>
        </MobileErrorBoundary>,
      );
      instance.handleReset();
    });
    expect(instance.state.hasError).toBe(false);
  });
});

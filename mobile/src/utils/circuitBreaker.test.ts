/**
 * @jest-environment node
 */

import { CircuitBreaker, CircuitState } from './circuitBreaker';

describe('CircuitBreaker', () => {
  it('starts CLOSED', () => {
    const cb = new CircuitBreaker('test');
    expect(cb.getState()).toBe(CircuitState.CLOSED);
  });

  it('opens after failures exceed threshold', async () => {
    const cb = new CircuitBreaker('failures', 3, 1, 1000);
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(async () => {
        throw new Error('boom');
      })).rejects.toThrow('boom');
    }
    expect(cb.getState()).toBe(CircuitState.OPEN);
  });

  it('fails fast when OPEN', async () => {
    const cb = new CircuitBreaker('fast-fail', 1, 1, 60_000);
    await expect(cb.execute(async () => {
      throw new Error('boom');
    })).rejects.toThrow('boom');
    expect(cb.getState()).toBe(CircuitState.OPEN);
    await expect(cb.execute(async () => 'ok')).rejects.toThrow('is OPEN');
  });

  it('resets and closes after recovery', async () => {
    const cb = new CircuitBreaker('recover', 1, 1, 50);
    await expect(cb.execute(async () => {
      throw new Error('boom');
    })).rejects.toThrow('boom');

    await new Promise(r => setTimeout(r, 100));
    const result = await cb.execute(async () => 'recovered');
    expect(result).toBe('recovered');
    expect(cb.getState()).toBe(CircuitState.CLOSED);
  });

  it('manual reset closes the breaker', async () => {
    const cb = new CircuitBreaker('manual', 1, 1, 60_000);
    await expect(cb.execute(async () => {
      throw new Error('boom');
    })).rejects.toThrow('boom');
    expect(cb.getState()).toBe(CircuitState.OPEN);

    cb.reset();
    expect(cb.getState()).toBe(CircuitState.CLOSED);
    const result = await cb.execute(async () => 'ok');
    expect(result).toBe('ok');
  });
});

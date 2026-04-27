import { describe, it, expect, vi, beforeEach } from 'vitest';
import { copyToClipboard } from '@/utils/clipboard';

describe('copyToClipboard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('uses Clipboard API when available and succeeds', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const result = await copyToClipboard('hello world');
    expect(result).toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello world');
  });

  it('falls back to execCommand when Clipboard API throws', async () => {
    const writeText = vi.fn().mockRejectedValue(new DOMException('Not allowed'));
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    // Mock execCommand fallback
    const execCommand = vi.fn().mockReturnValue(true);
    document.execCommand = execCommand;

    const result = await copyToClipboard('fallback text');
    expect(result).toBe(true);
    expect(execCommand).toHaveBeenCalledWith('copy');
  });

  it('falls back to execCommand when Clipboard API is absent', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });

    const execCommand = vi.fn().mockReturnValue(true);
    document.execCommand = execCommand;

    const result = await copyToClipboard('legacy copy');
    expect(result).toBe(true);
  });

  it('returns false when execCommand returns false', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });

    document.execCommand = vi.fn().mockReturnValue(false);

    const result = await copyToClipboard('fail');
    expect(result).toBe(false);
  });

  it('returns false when execCommand throws', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });

    document.execCommand = vi.fn().mockImplementation(() => {
      throw new Error('execCommand not supported');
    });

    const result = await copyToClipboard('throws');
    expect(result).toBe(false);
  });

  it('copies empty string without throwing', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    const result = await copyToClipboard('');
    expect(result).toBe(true);
  });
});

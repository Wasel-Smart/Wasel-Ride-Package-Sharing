import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('service worker install path', () => {
  it('should have a valid production sw.js', () => {
    const swPath = path.resolve('public/sw.js');
    const exists = fs.existsSync(swPath);
    expect(exists, `Missing service worker at ${swPath}`).toBe(true);
    const code = fs.readFileSync(swPath, 'utf-8');
    expect(code).toContain("self.addEventListener('install'");
    expect(code).toContain("self.addEventListener('activate'");
    expect(code).toContain("self.addEventListener('fetch'");
    expect(code).toContain('skipWaiting');
    expect(code).toContain('caches.open');
    expect(code).toContain('cache.addAll');
  });

  it('should precache required static assets', () => {
    const swPath = path.resolve('public/sw.js');
    const code = fs.readFileSync(swPath, 'utf-8');
    expect(code).toContain("'/offline.html'");
    expect(code).toContain("'/manifest.webmanifest'");
    expect(code).toContain("'/favicon.ico'");
  });

  it('should register service worker from main.tsx in production', async () => {
    const mainPath = path.resolve('src/main.tsx');
    const code = fs.readFileSync(mainPath, 'utf-8');
    expect(code).toContain("navigator.serviceWorker.register('/sw.js',");
    expect(code).toContain('import.meta.env.PROD');
  });
});

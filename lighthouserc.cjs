module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'Local.*4173',
      startServerReadyTimeout: 30000,
      url: ['http://127.0.0.1:4173/'],
      numberOfRuns: 3,
      settings: {
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        formFactor: 'mobile',
        screenEmulation: {
          mobile: true,
          width: 375,
          height: 812,
          deviceScaleFactor: 2,
          disabled: false,
        },
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4,
        },
      },
    },
    assert: {
      assertions: {
        'categories:performance':          ['error', { minScore: 0.9 }],
        'categories:accessibility':        ['error', { minScore: 0.9 }],
        'categories:best-practices':       ['error', { minScore: 0.9 }],
        'categories:seo':                  ['error', { minScore: 0.9 }],
        'first-contentful-paint':          ['error', { maxNumericValue: 1800 }],
        'largest-contentful-paint':        ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift':         ['error', { maxNumericValue: 0.05 }],
        'total-blocking-time':             ['error', { maxNumericValue: 150 }],
        'server-response-time':            ['error', { maxNumericValue: 600 }],
        'interactive':                     ['warn',  { maxNumericValue: 3800 }],
        'speed-index':                     ['warn',  { maxNumericValue: 3400 }],
        'uses-optimized-images':           ['warn',  { minScore: 0 }],
        'uses-text-compression':           ['error', { minScore: 0 }],
        'render-blocking-resources':       ['warn',  { minScore: 0 }],
        'unused-javascript':               ['warn',  { minScore: 0 }],
        'unused-css-rules':                ['warn',  { minScore: 0 }],
        'uses-rel-preconnect':             ['warn',  { minScore: 0 }],
        'efficient-animated-content':      ['warn',  { minScore: 0 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};

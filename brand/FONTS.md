# Wasel Font System

## Self-Hosted Fonts

All Wasel fonts are served from `/fonts/` for offline/PWA resilience and performance.

### Directory Structure

```
public/fonts/
├── plus-jakarta-sans/
│   ├── PlusJakartaSans-Regular.woff2
│   ├── PlusJakartaSans-Medium.woff2
│   ├── PlusJakartaSans-SemiBold.woff2
│   ├── PlusJakartaSans-Bold.woff2
│   └── PlusJakartaSans-ExtraBold.woff2
├── cairo/
│   ├── Cairo-Regular.woff2
│   ├── Cairo-SemiBold.woff2
│   └── Cairo-Bold.woff2
├── tajawal/
│   ├── Tajawal-Regular.woff2
│   ├── Tajawal-Medium.woff2
│   └── Tajawal-Bold.woff2
└── jetbrains-mono/
    ├── JetBrainsMono-Regular.woff2
    └── JetBrainsMono-Bold.woff2
```

### Font Loading Strategy

1. **Preload** critical fonts in `index.html`
2. **Font-display: swap** for all fonts
3. **Unicode-range** subsetting for Arabic/Latin
4. **Local-first** with `local()` sources

### Font Weights Required

| Font | Weights | Usage |
|------|---------|-------|
| Plus Jakarta Sans | 400, 500, 600, 700, 800 | Primary Latin |
| Cairo | 400, 600, 700 | Primary Arabic |
| Tajawal | 400, 500, 700 | Arabic display |
| JetBrains Mono | 400, 700 | Code/data |

### Download Command

```bash
# Using google-webfonts-helper
npx google-webfonts-helper \
  --fonts 'Plus Jakarta Sans:wght@400;500;600;700;800' \
  --fonts 'Cairo:wght@400;600;700' \
  --fonts 'Tajawal:wght@400;500;700' \
  --fonts 'JetBrains Mono:wght@400;700' \
  --output ./public/fonts
```

### CSS @font-face

```css
@font-face {
  font-family: 'Plus Jakarta Sans';
  font-style: normal;
  font-weight: 400 800;
  font-display: swap;
  src: url('/fonts/plus-jakarta-sans/PlusJakartaSans-Regular.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
```

### Font Budget

- Target: < 200KB total (WOFF2 compressed)
- Latin subset: ~120KB
- Arabic subset: ~80KB

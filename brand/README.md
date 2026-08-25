# Wasel Brand

Canonical brand assets, guidelines, and manifest for the Wasel mobility platform.

## Directory Structure

```
brand/
├── assets/                    # Static brand assets (copied to public/ by build)
│   ├── logos/
│   │   ├── primary/          # Full wordmark logos
│   │   │   ├── logo-default.{svg,png,webp,avif}
│   │   │   ├── logo-dark.{svg,png,webp,avif}
│   │   │   ├── logo-light.{svg,png,webp,avif}
│   │   │   ├── logo-white.svg
│   │   │   ├── logo-black.svg
│   │   │   ├── logo-monochrome.svg
│   │   │   └── logo-default-{64,96,160,280,512}.{png,webp,avif}
│   │   └── symbols/          # Symbol/icon-only logos
│   │       ├── symbol-default.{svg,png,webp,avif}
│   │       ├── symbol-white.svg
│   │       └── w-mark.{png,webp,avif}
│   ├── icons/                # App icons and favicons
│   │   ├── app-icon.{svg,png,webp,avif}
│   │   ├── app-icon-white.svg
│   │   └── favicon.svg
│   ├── og/                   # Open Graph images
│   │   └── og-default.{png,webp,avif}
│   └── social/               # Social media assets
│       └── social-dark.{svg,png,webp,avif}
├── docs/
│   └── BRAND_GUIDELINES.md   # Comprehensive brand guidelines
├── brand-manifest.json       # Machine-readable asset registry
└── README.md                 # This file
```

## Usage

### React Components

```tsx
import { WaselLogo, WaselMark, WaselHeroMark, WaselIcon } from '@/components/wasel-ui/WaselLogo';

// Full logo with wordmark
<WaselLogo size={120} showWordmark={true} theme="dark" />

// Symbol only
<WaselMark size={40} />

// Hero/large framed symbol
<WaselHeroMark size={200} />

// Compact icon
<WaselIcon size={20} />
```

### Asset Resolver

```ts
import { logoPath, symbolPath, iconPath, ogPath, socialPath } from '@/utils/brand-assets';

// Get path to a specific brand asset
const logoSvg = logoPath('default', 'svg', 512);
const symbolWebp = symbolPath('default', 'webp');
const ogImage = ogPath('png');
```

### Brand Manifest

```ts
import brandManifest from '@/brand/brand-manifest.json';

// Access asset metadata programmatically
console.log(brandManifest.logos.primary.variants.default.path);
```

## Naming Convention

```
{type}-{variant}-{size}.{format}

Examples:
- logo-default-512.png
- symbol-dark.svg
- icon-app-192.webp
- og-default.png
```

## Variants

| Variant | Background | Usage |
|---------|-----------|-------|
| `default` | Transparent | General purpose |
| `dark` | Light backgrounds | Headers, light mode |
| `light` | Dark backgrounds | Dark mode, navy backgrounds |
| `white` | Colored/dark | Over photos, gradients |
| `black` | Light backgrounds | Print, high contrast |
| `monochrome` | Any | Single-color applications |

## Formats

| Format | Usage |
|--------|-------|
| SVG | Vector, icons, logos (preferred) |
| PNG | Raster, fallback |
| WebP | Web optimized raster |
| AVIF | Next-gen web raster |

## Guidelines

See `docs/BRAND_GUIDELINES.md` for complete brand guidelines including:
- Color system
- Typography
- Logo clear space and minimum sizes
- Accessibility requirements
- Component API documentation

# Landing Design Audit

Source of truth: `src/features/home/LandingSections.tsx`, `src/features/home/landing/landingTypes.ts`, `src/features/home/landingConstants.ts`, `src/styles/brand-theme.css`.

## Palette

- Primary action: `#A9E3FF`
- Secondary accent: `#19E7BB`
- Support accent: `#7ECDF9`
- Background: `#060D1A`
- Strong surface: `rgba(10,18,28,0.84)`
- Muted surface: `rgba(220,255,248,0.055)`
- Border: `rgba(255,255,255,0.10)`
- Strong border/focus: `rgba(169,227,255,0.22)`
- Text primary: `#DCFFF8`
- Text secondary: `rgba(220,255,248,0.72)`
- Text muted: `rgba(220,255,248,0.48)`
- States: success `#19E7BB`, warning `#F8BA3E`, error `#FF5060`

## Typography

- Display: `Space Grotesk`
- UI/body: `Plus Jakarta Sans`
- Arabic support: `Cairo`, `Tajawal`
- Display scale: `clamp(2.75rem, 5vw, 5.15rem)` with tight tracking
- Page heading scale: `clamp(1.35rem, 2.4vw, 1.72rem)`
- Body copy: `0.9rem` to `1rem` with `1.65` to `1.75` line-height
- Eyebrow labels: uppercase, `0.66rem` to `0.76rem`, `0.08em` to `0.12em` tracking

## Spacing And Layout

- Base spacing: 4px scale
- Primary content width: `1380px`
- Readable inner content width: `760px`
- Shell padding: `20px` inline, `28px` top, `72px` to `84px` bottom
- Section rhythm: `18px` to `28px`
- Card padding: `18px` to `30px`
- Breakpoints: `480`, `640`, `768`, `900`, `1024`, `1280`, `1536`

## Shapes And Elevation

- Small radius: `10px`
- Medium radius: `14px` to `18px`
- Panel radius: `22px` to `34px`
- Pills: `9999px`
- Elevation: dark, soft, blurred panels with deep shadow and subtle inner glow

## Components

- Buttons: rounded pill primary gradient, soft secondary/ghost variants, clear hover lift
- Inputs: tall rounded fields, glass-like dark surface, visible focus halo
- Cards: blurred dark panels with soft gradient fill and low-contrast border
- Tabs/segmented controls: pill container with elevated active state
- Badges: uppercase micro labels with accent-tinted backgrounds
- Icons: Lucide stroke icons, mostly `14px` to `20px`, consistent stroke style

## Motion

- Fast hover/press transitions: `120ms` to `180ms`
- Card lift: subtle translateY on hover
- Live indicators: pulse loop
- Hero identity: float/orbit loops
- Reduced motion support is required on all animated surfaces

## Audit Findings Resolved

- Parallel token files were defining conflicting palettes.
- Service pages used light-page constants that drifted from the landing shell.
- Wallet primitives and shared UI primitives were not consuming the same surface, border, and action styles.
- Layout widths and page paddings were duplicated instead of centralized.
- Section headers, page briefs, and clarity bands now share one landing-derived shell rhythm.
- Buttons, inputs, cards, badges, and tabs now read from the same component radius, focus, and elevation rules.
- Auth copy and mobile layout were corrected so the form leads on smaller screens instead of the decorative hero.
- Privacy consent presentation was reduced on mobile to avoid overwhelming the first screen.

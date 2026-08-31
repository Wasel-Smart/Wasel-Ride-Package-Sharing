# Wasel brand production audit

Date: 2026-08-24

## Current brand score

**7.1 / 10** before this pass.

Wasel has a memorable bilingual premise, a distinctive movement symbol, strong Jordan-market relevance, and a documented master palette. The main production gap was not the logo itself; it was inconsistent execution across web, mobile, map, auth, loading, and notification surfaces.

## Production readiness gaps found across screens

| Area | Gap | Production impact | Resolution in this pass |
| --- | --- | --- | --- |
| Mobile palette | Mobile used legacy neon cyan/green tokens instead of the approved ink, blue, green, and orange palette. | Screens looked like a different product from the web app and brand guide. | Mobile theme now maps primary, secondary, status, surfaces, text, and shadows to approved brand tokens. |
| Mobile loading | The loading screen used a plain `W` tile, teal background, and a light `colors.navy` token that made the splash feel off-brand. | First impression did not match app icon, logo system, or Arabic-first positioning. | Loading now uses ink background, bilingual lockup, approved blue framed mark, and brand-colored activity indicator. |
| Mobile maps | Map frame used hard-coded non-brand navy and border colors. | Map surface did not align with shared design tokens. | Map frame now uses mobile surface and border tokens. |
| Web auth | Auth headline gradient used ad-hoc cyan/light-blue colors. | Hero emphasis diverged from the approved connection blue/movement green journey language. | Auth gradient now uses approved Connection Blue and Movement Green. |
| Web toaster | Toast styling used off-token dark background and cyan border. | System feedback looked disconnected from core brand surfaces. | Toasts now use ink/card surfaces and blue border tokens. |
| Documentation | Brand guidelines documented ideals, but there was no production screen audit or acceptance checklist. | Future features could regress into one-off colors, shadows, and logo variants. | Added this audit with score, gaps, acceptance criteria, and go/no-go checklist. |

## Remaining production gaps to close before launch

1. **Logo asset enforcement**: keep replacing any text-only or ad-hoc marks in future screens with the centralized web `WaselLogo` or a mobile equivalent.
2. **Mobile logo component**: add a React Native `WaselBrandMark` component backed by the same exported symbol assets instead of rebuilding marks per screen.
3. **Screenshot regression set**: capture auth, home, map, ride request, wallet, profile, notifications, offline, and error states in both English and Arabic.
4. **Token linting**: add a lightweight script to flag hard-coded brand-adjacent hex colors outside token files.
5. **App-store kit**: ensure store screenshots, splash, icon, OG image, and social card all use the same lockup and approved dark-background icon exports.
6. **Arabic typography QA**: verify Cairo/Tajawal availability and line-height on all high-copy Arabic screens.
7. **Accessibility contrast QA**: test blue/orange/green badges on both dark and light surfaces with WCAG contrast tooling.

## Production acceptance checklist

- [ ] Every primary navigation, auth, splash, offline, legal, and error screen displays the approved bilingual identity or approved compact symbol.
- [ ] Primary CTAs use Connection Blue; green is reserved for positive movement/success; orange is reserved for journey/package/warning emphasis.
- [ ] No cyan/neon legacy palette remains in feature screens unless explicitly mapped as a supporting data-viz accent.
- [ ] Shadows use blue/navy tones only.
- [ ] Arabic screens keep `واصل` visually equal to `Wasel` and preserve RTL layout.
- [ ] PWA/mobile metadata points to approved app icon and social image exports.

## Post-pass score

**8.4 / 10** after this pass.

The brand is now materially more consistent and closer to production-ready. It can reach **9+ / 10** after the remaining logo-component, screenshot-regression, token-linting, and app-store-kit tasks are completed.

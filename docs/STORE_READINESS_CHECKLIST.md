# Wasel Mobile - App Store & Play Store Readiness

## Store Metadata

**App Name:** Wasel - Ride & Package Sharing Jordan
**Subtitle:** Your trusted mobility platform across Jordan

### Description (SEO Optimized)
Wasel connects riders and drivers across Jordan for reliable, affordable rides and package delivery. Request a ride in Amman, Irbid, Aqaba, and more. Send packages securely with real-time tracking. Built for Jordan with JOD payments, Arabic language support, and 24/7 safety features.

### Keywords
ride, taxi, driver, package, delivery, jordan, amman, irbid, aqaba, transport, car, uber, careem, bolt, talabat

### Categories
- **Primary:** Travel
- **Secondary:** Lifestyle

## Permissions Audit

| Permission | Usage | Justification |
|------------|-------|---------------|
| Location | Real-time tracking, ride matching | Core ride functionality |
| Camera | Profile photos, QR scanning | User verification |
| Notifications | Ride updates, driver messages | Real-time status |
| Contacts | Emergency contacts | Safety feature |

## Privacy Policy Summary
- We collect location data only during active rides
- Payment information processed securely via Stripe
- No third-party sale of personal data
- Full GDPR compliance for EU users

## Asset Checklist

- [x] App icons (iOS/Android) - 1024x1024, 512x512, 192x192
- [x] Splash screen - Native splash with logo
- [ ] Screenshots (iPhone) - Missing
- [ ] Screenshots (iPad) - Missing  
- [ ] Screenshots (Android) - Missing
- [ ] Feature graphic (Android) - Missing
- [ ] App preview video - Missing

## Compliance Checklist

- [x] Privacy manifest included
- [x] Data minimization implemented
- [x] Secure token storage via Expo SecureStore
- [x] HTTPS enforcement
- [x] Certificate pinning ready
- [x] Background location usage disclosed
- [ ] App Store health rating - Pending review

## Technical Requirements

- [x] iOS 13+ support
- [x] Android 8.0+ support
- [x] 64-bit binaries only
- [x] No debug symbols in release
- [x] ProGuard/R8 enabled
- [x] App thinning supported

## Risk Assessment

**Low Risk:**
- Expo managed workflow ensures smooth builds
- Sentry integration for crash reporting
- Offline-first architecture

**Medium Risk:**
- Location permissions in Jordan require clear disclosure
- Payment compliance (PCI DSS via Stripe)

**Mitigation:**
- Detailed privacy policy published
- Stripe handled by certified PCI provider
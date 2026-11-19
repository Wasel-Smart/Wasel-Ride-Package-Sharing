# Wasel Mobile App Store & Google Play Publishing Guide
**App Identity:** Wasel | واصل (`online.wasel14.app`)  
**Target Stores:** Apple App Store (iOS) & Google Play Store (Android)

---

## 1. Store Metadata & Branding Checklist

### iOS App Store (App Store Connect)
- **App Name**: `Wasel | واصل`
- **Subtitle (Arabic)**: رحلات، حافلات، وتوصيل سريع في الأردن
- **Subtitle (English)**: Rides, Express Delivery & Transit in Jordan
- **Bundle ID**: `online.wasel14.app`
- **Primary Category**: Travel / Navigation (السفر والتنقل)
- **Secondary Category**: Utilities (الأدوات)
- **Age Rating**: 4+ (No unrestricted web access; user safety & content reporting enabled)
- **Privacy Policy URL**: `https://wasel14.online/privacy`
- **Terms of Service URL**: `https://wasel14.online/terms`
- **Support URL**: `https://wasel14.online/support`

### Google Play Console
- **App Name**: `Wasel - واصل`
- **Short Description**: تطبيق التنقل الذكي، النقل الجماعي، والطرود السريعة في الأردن.
- **Full Description**:
  واصل هو منصتك المتكاملة للتنقل الذكي في المملكة الأردنية الهاشمية:
  • مشاوير فورية ومجدولة بين المحافظات والمدن
  • شبكة النقل العام والحافلات الذكية
  • توصيل طرود سريع وموثوق مع تتبع حي ومباشر
  • محفظة رقمية مدمجة تدعم نظام كليك (CliQ) والبطاقات البنكية
  • أمان متكامل مع مركز الثقة وزر الطوارئ
- **Package Name**: `online.wasel14.app`
- **Content Rating**: Everyone (IARC Questionnaire certified)
- **Target Audience**: 18+

---

## 2. Store Assets & Creative Specifications

| Asset Type | Platform | Dimensions / Format | Status in Repository |
| :--- | :--- | :--- | :--- |
| **App Icon** | Universal | `1024 x 1024 PNG` (no transparency) | `mobile/assets/images/icon.png` |
| **Adaptive Icon** | Android | `432 x 432 PNG` (foreground) + `#081D39` | `mobile/assets/images/adaptive-icon.png` |
| **Notification Icon**| Android | `96 x 96 PNG` (white silhouette on transparent) | `mobile/assets/images/notification-icon.png` |
| **Splash Screen** | iOS & Android | `1284 x 2778 PNG` (contain mode, dark ink) | `mobile/assets/images/splash.png` |
| **Feature Graphic** | Google Play | `1024 x 500 PNG / JPEG` | `brand/assets/og/og-default.png` |

---

## 3. iOS Privacy & App Store Review Readiness

The `mobile/app.json` configuration includes:
1. **Camera Permission (`NSCameraUsageDescription`)**:
   - Bilingual justification for driver license scanning, identity verification, and avatar capture.
2. **Photo Library Permission (`NSPhotoLibraryUsageDescription`)**:
   - Bilingual justification for document attachment and profile photos.
3. **Location Services (`NSLocationWhenInUseUsageDescription` & `NSLocationAlwaysAndWhenInUseUsageDescription`)**:
   - Explains real-time route matching and safety tracking.
4. **Apple Privacy Manifest (`NSPrivacyAccessedAPITypes`)**:
   - Declares required API reasons for `UserDefaults` (`CA92.1`) and `SystemBootTime` (`35F9.1`), satisfying Apple's mandatory privacy requirements.
5. **Encryption Exemption (`ITSAppUsesNonExemptEncryption`)**:
   - Explicitly configured to `false` (standard HTTPS only), bypassing US Export Compliance hold times.

---

## 4. Production Build & Deployment Commands (EAS CLI)

### 1. Authenticate with Expo Application Services (EAS)
```bash
cd mobile
npx eas-cli login
```

### 2. Configure Credentials
```bash
# Automatically sets up Apple Distribution Certificate & Android Keystore
npx eas-cli credentials
```

### 3. Generate Production Release Builds
- **Google Play Android App Bundle (AAB)**:
  ```bash
  npx eas-cli build --platform android --profile production
  ```
- **Apple App Store IPA**:
  ```bash
  npx eas-cli build --platform ios --profile production
  ```

### 4. Automatic Store Submission
- **Submit to Google Play Production or Internal Track**:
  ```bash
  npx eas-cli submit --platform android --profile production
  ```
- **Submit to Apple TestFlight / App Store**:
  ```bash
  npx eas-cli submit --platform ios --profile production
  ```

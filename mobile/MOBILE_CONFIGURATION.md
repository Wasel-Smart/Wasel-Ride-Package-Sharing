# Mobile App — Required Configuration

Before running builds or publishing OTA updates you must replace the three
placeholder values in `app.json` and set the matching secrets in EAS.

---

## 1. EAS Project ID

**File:** `app.json` → `expo.extra.eas.projectId` and `expo.updates.url`

Run the following once to link this project to your Expo account:

```bash
cd mobile
npx eas-cli init          # creates / links the EAS project
npx eas-cli project:info  # confirms the project ID
```

Then replace every occurrence of `YOUR_EAS_PROJECT_ID` and `YOUR_PROJECT_ID`
in `app.json` with the UUID printed by the command above.

---

## 2. Google Maps API Keys

**File:** `app.json`
- `expo.ios.config.googleMapsApiKey`   → `YOUR_IOS_GOOGLE_MAPS_KEY`
- `expo.android.config.googleMaps.apiKey` → `YOUR_ANDROID_GOOGLE_MAPS_KEY`

Steps:
1. Go to <https://console.cloud.google.com/> → APIs & Services → Credentials.
2. Create two API keys (one for iOS, one for Android) and restrict each to
   the Maps SDK for the respective platform.
3. Replace the placeholder strings in `app.json` with the real keys.

**Never commit real API keys to version control.** Use EAS Secrets for CI/CD:

```bash
eas secret:create --scope project --name GOOGLE_MAPS_KEY_IOS   --value "AIza..."
eas secret:create --scope project --name GOOGLE_MAPS_KEY_ANDROID --value "AIza..."
```

Then reference them in `app.config.js` (rename `app.json` → `app.config.js`) if
you want dynamic injection:

```js
export default {
  expo: {
    ios: {
      config: { googleMapsApiKey: process.env.GOOGLE_MAPS_KEY_IOS },
    },
    android: {
      config: { googleMaps: { apiKey: process.env.GOOGLE_MAPS_KEY_ANDROID } },
    },
  },
};
```

---

## 3. Notification Icons (iOS / Android)

Place the following asset files in `mobile/assets/` before building:

| Asset path                          | Spec                                      |
|-------------------------------------|-------------------------------------------|
| `assets/notification-icon.png`      | 96 × 96 px, white-on-transparent PNG      |
| `assets/icon.png`                   | 1024 × 1024 px app icon                  |
| `assets/adaptive-icon.png`          | 1024 × 1024 px (Android adaptive layer)  |
| `assets/splash.png`                 | 1284 × 2778 px splash on `#0A1628` bg    |

---

## 4. Local .env file

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp mobile/.env.example mobile/.env.local
```

| Variable                  | Description                         |
|---------------------------|-------------------------------------|
| `EXPO_PUBLIC_SUPABASE_URL`| Your Supabase project URL           |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key      |

---

> **After completing all steps above**, remove this notice from the
> `MOBILE_CONFIGURATION.md` checklist and update `APPLICATION_GAPS_ANALYSIS.md`.

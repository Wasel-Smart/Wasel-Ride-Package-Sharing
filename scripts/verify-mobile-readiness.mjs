import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];

function readJson(relativePath) {
  const absolute = path.join(root, relativePath);
  if (!fs.existsSync(absolute)) {
    failures.push(`${relativePath} is missing`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(absolute, 'utf8'));
  } catch (error) {
    failures.push(`${relativePath} is not valid JSON: ${error.message}`);
    return null;
  }
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

const manifest = readJson('public/manifest.json');
if (manifest) {
  assert(manifest.name?.includes('Wasel'), 'manifest name must contain Wasel');
  assert(manifest.display === 'standalone', 'manifest display must be standalone');
  assert(manifest.orientation === 'portrait-primary', 'manifest orientation must be portrait-primary');
  assert(Array.isArray(manifest.icons) && manifest.icons.some((icon) => icon.src === '/brand/wasel-mark-clean.svg'), 'manifest must include canonical Wasel SVG icon');
  assert(Array.isArray(manifest.shortcuts) && manifest.shortcuts.length >= 4, 'manifest must expose core mobile shortcuts');
}

const capacitor = readJson('capacitor.config.json');
if (capacitor) {
  assert(capacitor.appId === 'online.wasel14.app', 'Capacitor appId must be online.wasel14.app');
  assert(capacitor.appName === 'Wasel', 'Capacitor appName must be Wasel');
  assert(capacitor.webDir === 'dist', 'Capacitor webDir must point to dist');
  assert(capacitor.server?.androidScheme === 'https', 'Capacitor Android scheme must be https');
}

const requiredFiles = [
  'index.html',
  'public/sw.js',
  'public/offline.html',
  'public/brand/wasel-mark-clean.svg',
  'src/components/wasel-ds/WaselLogo.tsx',
  'docs/MOBILE_WEB_COMPLETENESS.md',
  'native/README.md',
  'native/android/settings.gradle',
  'native/android/app/build.gradle',
  'native/android/app/src/main/AndroidManifest.xml',
  'native/android/app/src/main/java/online/wasel14/app/MainActivity.kt',
  'native/ios/Wasel/Info.plist',
  'native/ios/Wasel/AppDelegate.swift',
];
for (const file of requiredFiles) {
  assert(fs.existsSync(path.join(root, file)), `${file} is required for mobile/web readiness`);
}

const androidManifest = fs.existsSync(path.join(root, 'native/android/app/src/main/AndroidManifest.xml'))
  ? fs.readFileSync(path.join(root, 'native/android/app/src/main/AndroidManifest.xml'), 'utf8')
  : '';
const androidBuild = fs.existsSync(path.join(root, 'native/android/app/build.gradle'))
  ? fs.readFileSync(path.join(root, 'native/android/app/build.gradle'), 'utf8')
  : '';
assert(androidBuild.includes("namespace 'online.wasel14.app'"), 'Android Gradle config must use the Wasel application namespace');
assert(androidBuild.includes("applicationId 'online.wasel14.app'"), 'Android Gradle config must use the Wasel application id');
assert(androidManifest.includes('android.permission.ACCESS_FINE_LOCATION'), 'Android manifest must request location permission for live mobility');
assert(androidManifest.includes('android.permission.POST_NOTIFICATIONS'), 'Android manifest must request notification permission');
assert(androidManifest.includes('wasel14.online'), 'Android manifest must include Wasel production deep link host');

const iosInfo = fs.existsSync(path.join(root, 'native/ios/Wasel/Info.plist'))
  ? fs.readFileSync(path.join(root, 'native/ios/Wasel/Info.plist'), 'utf8')
  : '';
assert(iosInfo.includes('online.wasel14.app'), 'iOS Info.plist must use the Wasel bundle id');
assert(iosInfo.includes('NSLocationWhenInUseUsageDescription'), 'iOS Info.plist must include location permission copy');
assert(iosInfo.includes('remote-notification'), 'iOS Info.plist must declare remote notification background mode');


const indexHtml = fs.existsSync(path.join(root, 'index.html'))
  ? fs.readFileSync(path.join(root, 'index.html'), 'utf8')
  : '';
assert(indexHtml.includes('viewport-fit=cover'), 'index.html must include safe-area viewport support');
assert(indexHtml.includes('name="theme-color"'), 'index.html must define the mobile browser theme color');
assert(indexHtml.includes('rel="manifest"'), 'index.html must link the PWA manifest');
assert(indexHtml.includes('/brand/wasel-mark-clean.svg'), 'index.html must preload and advertise the canonical Wasel mark');

const serviceWorker = fs.existsSync(path.join(root, 'public/sw.js'))
  ? fs.readFileSync(path.join(root, 'public/sw.js'), 'utf8')
  : '';
assert(serviceWorker.includes('/offline.html'), 'service worker must precache the offline page');
assert(serviceWorker.includes('/manifest.json'), 'service worker must precache the manifest');
assert(serviceWorker.includes('/brand/wasel-mark-clean.svg'), 'service worker must precache the canonical Wasel mark');

const sourceRoots = ['src', 'public', 'docs', 'native'];
const mojibakePattern = /[ØÙ]/;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', 'dist', 'build'].includes(entry.name)) walk(absolute);
      continue;
    }
    if (!/\.(ts|tsx|js|mjs|html|md|json|css|svg)$/.test(entry.name)) continue;
    const text = fs.readFileSync(absolute, 'utf8');
    if (mojibakePattern.test(text)) {
      failures.push(`${path.relative(root, absolute)} contains mojibake markers (Ø/Ù)`);
    }
  }
}
for (const relative of sourceRoots) {
  const absolute = path.join(root, relative);
  if (fs.existsSync(absolute)) walk(absolute);
}

if (failures.length > 0) {
  console.error('Mobile/web readiness failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Mobile/web readiness checks passed.');

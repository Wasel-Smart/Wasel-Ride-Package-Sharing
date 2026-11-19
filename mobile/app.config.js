const fs = require('fs');
const path = require('path');

const appConfig = require('./app.json');

const googleServicesPath = path.join(__dirname, 'google-services.json');

if (fs.existsSync(googleServicesPath)) {
  appConfig.expo.android = {
    ...appConfig.expo.android,
    googleServicesFile: './google-services.json',
  };
}

// Ensure EAS project ID is explicitly propagated.
// Set EAS_PROJECT_ID in EAS Secrets / CI environment — never hardcode it here.
// If the env var is absent the build will still proceed but EAS services
// (OTA updates, push tokens) will not resolve the project correctly.
const easProjectId = process.env.EAS_PROJECT_ID;
if (!easProjectId && process.env.NODE_ENV !== 'test') {
  console.warn(
    '[app.config] EAS_PROJECT_ID is not set. ' +
    'Push notifications and OTA updates will not work correctly. ' +
    'Set this variable in EAS Secrets or your CI environment.',
  );
}

appConfig.expo.extra = {
  ...appConfig.expo.extra,
  eas: {
    ...(appConfig.expo.extra && appConfig.expo.extra.eas),
    projectId: easProjectId ?? undefined,
  },
};

module.exports = appConfig;


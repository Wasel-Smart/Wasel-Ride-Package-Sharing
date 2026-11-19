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

// Ensure EAS project ID is explicitly propagated
appConfig.expo.extra = {
  ...appConfig.expo.extra,
  eas: {
    ...(appConfig.expo.extra && appConfig.expo.extra.eas),
    projectId: process.env.EAS_PROJECT_ID || '2d6bb74e-3833-4c95-9ec8-3e50a7359ee3',
  },
};

module.exports = appConfig;


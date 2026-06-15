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

module.exports = appConfig;

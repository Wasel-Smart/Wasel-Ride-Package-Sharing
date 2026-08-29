/**
 * Wasel Mobile App Entry Point
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './src/App';
import appConfig from './app.json';

AppRegistry.registerComponent(appConfig.expo.name, () => App);
